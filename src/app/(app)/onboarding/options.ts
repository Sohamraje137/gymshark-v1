// Choices on the onboarding form. Values match the enums in ClientProfile.onboarding.

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary (desk job, little exercise)" },
  { value: "light", label: "Lightly active (exercise 1–3 days a week)" },
  { value: "moderate", label: "Moderately active (exercise 3–5 days a week)" },
  { value: "very_active", label: "Very active (hard exercise 6–7 days or a physical job)" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner (less than 1 year)" },
  { value: "intermediate", label: "Intermediate (1–3 years)" },
  { value: "advanced", label: "Advanced (3+ years)" },
] as const;

/** Allowed age range, used for the date-of-birth input and its server-side check. */
export const MIN_AGE = 13;
export const MAX_AGE = 100;

/** Earliest and latest allowed date of birth ("YYYY-MM-DD") relative to `today`. */
export function dobRange(today: string) {
  const year = Number(today.slice(0, 4));
  const shift = (years: number) => `${year - years}${today.slice(4)}`.replace(/-02-29$/, "-02-28");
  return { min: shift(MAX_AGE), max: shift(MIN_AGE) };
}
