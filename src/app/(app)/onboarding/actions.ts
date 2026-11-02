"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayIn } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { ClientProfile } from "@/models";
import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, SEX_OPTIONS, dobRange } from "./options";

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Client saves their intake answers. The first save completes onboarding. */
export async function saveOnboarding(formData: FormData) {
  const user = await requireClient();
  const set: Record<string, string | number> = {};
  const unset: Record<string, 1> = {};

  const text = (name: string, label: string, max: number, required = false) => {
    const v = String(formData.get(name) ?? "").trim();
    if (v.length > max) throw new Error(`${label} must be at most ${max} characters.`);
    if (required && !v) throw new Error(`${label} is required.`);
    if (v) set[`onboarding.${name}`] = v;
    else unset[`onboarding.${name}`] = 1;
  };
  const number = (name: string, label: string, min: number, max: number, required = false) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) {
      if (required) throw new Error(`${label} is required.`);
      return void (unset[`onboarding.${name}`] = 1);
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
    set[`onboarding.${name}`] = Math.round(n * 10) / 10;
  };
  const choice = (name: string, label: string, options: readonly { value: string }[]) => {
    const v = String(formData.get(name) ?? "");
    if (!options.some((o) => o.value === v)) throw new Error(`Please choose your ${label}.`);
    set[`onboarding.${name}`] = v;
  };

  text("goals", "Goals", 2000, true);

  const dob = String(formData.get("dateOfBirth") ?? "");
  const { min, max } = dobRange(todayIn("UTC"));
  const parsed = new Date(`${dob}T00:00:00Z`);
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(dob) && !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(dob);
  if (!validDay || dob < min || dob > max) throw new Error("Please enter a valid date of birth.");
  set["onboarding.dateOfBirth"] = dob;

  choice("sex", "sex", SEX_OPTIONS);
  number("heightCm", "Height", 100, 250, true);
  number("startWeightKg", "Current weight", 30, 300, true);
  number("targetWeightKg", "Target weight", 30, 300);
  choice("activityLevel", "activity level", ACTIVITY_OPTIONS);
  choice("trainingExperience", "training experience", EXPERIENCE_OPTIONS);
  text("availability", "Availability", 1000);
  text("healthConditions", "Health conditions", 2000);
  text("injuries", "Injuries", 2000);
  text("medications", "Medications", 2000);
  text("dietaryPreferences", "Dietary preferences", 2000);

  const timeZone = String(formData.get("timeZone") ?? "").trim();
  if (timeZone && timeZone.length <= 100 && isTimeZone(timeZone)) set.timeZone = timeZone;

  await ClientProfile.updateOne(
    { user: user._id },
    { $set: set, ...(Object.keys(unset).length > 0 && { $unset: unset }) },
    { upsert: true, runValidators: true },
  );
  // First completion: stamp completedAt and activate. Paused/archived clients keep their status.
  await ClientProfile.updateOne(
    { user: user._id, "onboarding.completedAt": { $exists: false } },
    { $set: { "onboarding.completedAt": new Date() } },
  );
  await ClientProfile.updateOne({ user: user._id, status: "onboarding" }, { $set: { status: "active" } });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  revalidatePath("/clients/" + user.id);
  redirect("/dashboard");
}
