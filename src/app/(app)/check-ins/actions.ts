"use server";

import { revalidatePath } from "next/cache";
import { RATINGS } from "@/components/checkins/CheckInDetails";
import { mondayOf, todayIn } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { CheckIn, ClientProfile } from "@/models";

/** Client submits (or edits, until the coach has reviewed it) this week's check-in. */
export async function submitCheckIn(formData: FormData) {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id }, "timeZone").lean();
  const weekOf = mondayOf(todayIn(profile?.timeZone || "UTC"));

  const set: Record<string, string | number> = {};
  const unset: Record<string, 1> = {};

  const optionalNumber = (name: string, label: string, min: number, max: number) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return void (unset[name] = 1);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
    set[name] = Math.round(n * 10) / 10;
  };
  optionalNumber("weightKg", "Weight", 30, 300);
  optionalNumber("waistCm", "Waist", 40, 200);

  for (const r of RATINGS) {
    const n = Number(formData.get(r.name));
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`Please rate ${r.label.toLowerCase()} from 1 to 5.`);
    set[r.name] = n;
  }

  for (const name of ["wins", "struggles", "questions"]) {
    const v = String(formData.get(name) ?? "").trim();
    if (v.length > 3000) throw new Error("Each text answer must be at most 3000 characters.");
    if (v) set[name] = v;
    else unset[name] = 1;
  }

  try {
    // Only unreviewed check-ins match; if a reviewed one exists, the upsert's insert hits the unique index.
    await CheckIn.updateOne(
      { client: user._id, weekOf, reviewedAt: { $exists: false } },
      { $set: set, ...(Object.keys(unset).length > 0 && { $unset: unset }) },
      { upsert: true, runValidators: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new Error("Your coach has already reviewed this week's check-in.");
    }
    throw err;
  }
  revalidatePath("/check-ins");
  revalidatePath("/dashboard");
  revalidatePath("/clients/" + user.id);
}
