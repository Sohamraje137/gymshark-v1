// Plain constants/helpers for the /log page, its server actions and its client components.
// No server-only imports here: the client components import this file too.

/** Unit filled in for each activity type unless the client types another one. */
export const DEFAULT_UNITS: Record<string, string> = {
  steps: "steps",
  cardio: "min",
  sleep: "h",
  water: "L",
  mobility: "min",
  other: "",
};

/** Largest believable value for one activity entry in its default unit. */
export const ACTIVITY_MAX: Record<string, number> = {
  steps: 200_000,
  cardio: 1440,
  sleep: 24,
  water: 20,
  mobility: 1440,
};
export const ACTIVITY_MAX_OTHER = 100_000;

export const LIMITS = {
  calories: 10_000,
  macroG: 1_000,
  durationMin: 1440,
  exercises: 30,
  setsPerExercise: 20,
  reps: 1_000,
  weightKg: 1_000,
} as const;

/** True for a real calendar day in "YYYY-MM-DD" form (rejects 2026-02-30 and 2026-13-01). */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** What the workout form's exercise rows serialize into its hidden `exercises` input. */
export type ExerciseRowInput = { name: string; sets: number; reps?: number; weightKg?: number };
