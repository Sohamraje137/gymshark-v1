"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { todayIn } from "@/lib/dates";
import { requireClient, type CurrentUser } from "@/lib/session";
import { ACTIVITY_TYPES, ActivityLog, ClientProfile, MEAL_TYPES, MealLog, WorkoutLog } from "@/models";
import { ACTIVITY_MAX, ACTIVITY_MAX_OTHER, DEFAULT_UNITS, isDay, LIMITS, type ExerciseRowInput } from "./shared";

// ---------- Form parsing ----------

function text(formData: FormData, name: string, label: string, maxLength: number, required = false) {
  const value = String(formData.get(name) ?? "").trim();
  if (required && !value) throw new Error(`${label} is required.`);
  if (value.length > maxLength) throw new Error(`${label} must be at most ${maxLength} characters.`);
  return value || undefined;
}

function checkNumber(value: unknown, label: string, max: number, integer = false): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${label} must be ${integer ? "a whole number" : "a number"} between 0 and ${max.toLocaleString("en-US")}.`);
  }
  return n;
}

/** Optional number field: blank → undefined. */
function optionalNumber(formData: FormData, name: string, label: string, max: number) {
  const raw = String(formData.get(name) ?? "").trim();
  return raw === "" ? undefined : checkNumber(raw, label, max);
}

function oneOf<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Please choose a valid ${label}.`);
}

/** The day the entry is for: a real date, no later than the client's today. */
async function logDay(formData: FormData, user: CurrentUser) {
  const date = formData.get("date");
  if (!isDay(date)) throw new Error("Invalid date.");
  const profile = await ClientProfile.findOne({ user: user._id }).select("timeZone").lean();
  if (date > todayIn(profile?.timeZone || "UTC")) throw new Error("You can't log entries for a future day.");
  return date;
}

function parseExercises(raw: FormDataEntryValue | null) {
  if (raw == null || raw === "") return [];
  let rows: unknown;
  try {
    rows = JSON.parse(String(raw));
  } catch {
    throw new Error("Could not read the exercises. Please try again.");
  }
  if (!Array.isArray(rows)) throw new Error("Could not read the exercises. Please try again.");
  if (rows.length > LIMITS.exercises) throw new Error(`At most ${LIMITS.exercises} exercises per workout.`);

  return rows.flatMap((row: Partial<Record<keyof ExerciseRowInput, unknown>>) => {
    if (typeof row !== "object" || row === null) throw new Error("Could not read the exercises. Please try again.");
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) return []; // blank rows are ignored
    if (name.length > 100) throw new Error("Exercise names must be at most 100 characters.");
    const count = row.sets == null ? 1 : checkNumber(row.sets, `Sets for ${name}`, LIMITS.setsPerExercise, true);
    const reps = row.reps == null ? undefined : checkNumber(row.reps, `Reps for ${name}`, LIMITS.reps, true);
    const weightKg = row.weightKg == null ? undefined : checkNumber(row.weightKg, `Weight for ${name}`, LIMITS.weightKg);
    const set = { ...(reps !== undefined && { reps }), ...(weightKg !== undefined && { weightKg }) };
    return [{ name, sets: Array.from({ length: Math.max(count, 1) }, () => ({ ...set })) }];
  });
}

// ---------- Actions ----------

export async function addMeal(formData: FormData) {
  const user = await requireClient();
  const date = await logDay(formData, user);
  await MealLog.create({
    client: user._id,
    date,
    mealType: oneOf(formData.get("mealType"), MEAL_TYPES, "meal type"),
    description: text(formData, "description", "Description", 1000, true),
    calories: optionalNumber(formData, "calories", "Calories", LIMITS.calories),
    proteinG: optionalNumber(formData, "proteinG", "Protein", LIMITS.macroG),
    carbsG: optionalNumber(formData, "carbsG", "Carbs", LIMITS.macroG),
    fatG: optionalNumber(formData, "fatG", "Fat", LIMITS.macroG),
    source: "manual",
  });
  revalidatePath("/log");
}

export async function addWorkout(formData: FormData) {
  const user = await requireClient();
  const date = await logDay(formData, user);
  await WorkoutLog.create({
    client: user._id,
    date,
    title: text(formData, "title", "Title", 200, true),
    durationMin: optionalNumber(formData, "durationMin", "Duration", LIMITS.durationMin),
    exercises: parseExercises(formData.get("exercises")),
    notes: text(formData, "notes", "Notes", 2000),
    source: "manual",
  });
  revalidatePath("/log");
}

export async function addActivity(formData: FormData) {
  const user = await requireClient();
  const date = await logDay(formData, user);
  const type = oneOf(formData.get("type"), ACTIVITY_TYPES, "activity type");
  const unit = text(formData, "unit", "Unit", 20) ?? DEFAULT_UNITS[type] ?? "";
  // Type-specific limits only make sense in the default unit.
  const max = unit === DEFAULT_UNITS[type] ? (ACTIVITY_MAX[type] ?? ACTIVITY_MAX_OTHER) : ACTIVITY_MAX_OTHER;
  const rawValue = String(formData.get("value") ?? "").trim();
  if (!rawValue) throw new Error("Value is required.");
  await ActivityLog.create({
    client: user._id,
    date,
    type,
    value: checkNumber(rawValue, "Value", max),
    unit: unit || undefined,
    notes: text(formData, "notes", "Notes", 1000),
    source: "manual",
  });
  revalidatePath("/log");
}

const LOG_MODELS = { meal: MealLog, workout: WorkoutLog, activity: ActivityLog } as const;

/** Deletes one of the current client's own entries. Entries of other clients are never matched. */
export async function deleteLog(kind: keyof typeof LOG_MODELS, id: string) {
  const user = await requireClient();
  if (!Object.hasOwn(LOG_MODELS, kind) || typeof id !== "string" || !isValidObjectId(id)) throw new Error("Entry not found.");
  const model = LOG_MODELS[kind];
  // The three models have different document types; the filter is the same for all of them.
  await (model as typeof MealLog).deleteOne({ _id: id, client: user._id });
  revalidatePath("/log");
}
