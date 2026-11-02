import type { ReactNode } from "react";
import { TimeZoneInput } from "@/components/TimeZoneInput";
import { todayIn } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { ClientProfile } from "@/models";
import { saveOnboarding } from "./actions";
import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, SEX_OPTIONS, dobRange } from "./options";

export const metadata = { title: "Onboarding" };

const label = "block text-xs font-medium text-slate-600";

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Select({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
}) {
  return (
    <select name={name} required defaultValue={defaultValue ?? ""} className="input mt-1">
      <option value="" disabled>
        Select…
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default async function OnboardingPage() {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id }, "onboarding").lean();
  const o = profile?.onboarding;
  const done = !!o?.completedAt;
  const dob = dobRange(todayIn("UTC"));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title mb-1">{done ? "Your intake" : "Welcome! Let's get you set up"}</h1>
      <p className="mb-6 text-sm text-slate-500">
        {done
          ? "Keep this up to date so your coach has the full picture."
          : "Tell your coach about your goals, health and routine. It takes about 5 minutes."}
      </p>

      <form action={saveOnboarding} className="space-y-5">
        <TimeZoneInput />

        <Section title="Goals">
          <label className={label}>
            What do you want to achieve, and why now?
            <textarea
              name="goals"
              rows={4}
              required
              maxLength={2000}
              defaultValue={o?.goals ?? ""}
              placeholder="e.g. Lose 8 kg before summer, get stronger, have more energy for my kids"
              className="input mt-1"
            />
          </label>
        </Section>

        <Section title="About you">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Date of birth
              <input
                type="date"
                name="dateOfBirth"
                required
                min={dob.min}
                max={dob.max}
                defaultValue={o?.dateOfBirth ?? ""}
                className="input mt-1"
              />
            </label>
            <label className={label}>
              Sex
              <Select name="sex" options={SEX_OPTIONS} defaultValue={o?.sex} />
            </label>
            <label className={label}>
              Height (cm)
              <input
                type="number"
                name="heightCm"
                inputMode="decimal"
                required
                min={100}
                max={250}
                step="0.1"
                defaultValue={o?.heightCm ?? ""}
                className="input mt-1"
              />
            </label>
            <label className={label}>
              Current weight (kg)
              <input
                type="number"
                name="startWeightKg"
                inputMode="decimal"
                required
                min={30}
                max={300}
                step="0.1"
                defaultValue={o?.startWeightKg ?? ""}
                className="input mt-1"
              />
            </label>
            <label className={label}>
              Target weight (kg, optional)
              <input
                type="number"
                name="targetWeightKg"
                inputMode="decimal"
                min={30}
                max={300}
                step="0.1"
                defaultValue={o?.targetWeightKg ?? ""}
                className="input mt-1"
              />
            </label>
          </div>
        </Section>

        <Section title="Lifestyle">
          <label className={label}>
            Activity level
            <Select name="activityLevel" options={ACTIVITY_OPTIONS} defaultValue={o?.activityLevel} />
          </label>
          <label className={label}>
            Training experience
            <Select name="trainingExperience" options={EXPERIENCE_OPTIONS} defaultValue={o?.trainingExperience} />
          </label>
          <label className={label}>
            When can you train? Days, times, how long per session
            <textarea
              name="availability"
              rows={2}
              maxLength={1000}
              defaultValue={o?.availability ?? ""}
              placeholder="e.g. Mon/Wed/Fri mornings, 45 min; weekends flexible"
              className="input mt-1"
            />
          </label>
        </Section>

        <Section
          title="Health"
          hint="This helps your coach tailor your plan. It is not medical advice: check with your doctor before starting a new exercise or nutrition program, especially if you have a medical condition."
        >
          <label className={label}>
            Health conditions
            <textarea
              name="healthConditions"
              rows={2}
              maxLength={2000}
              defaultValue={o?.healthConditions ?? ""}
              placeholder="e.g. asthma, high blood pressure. Leave empty if none."
              className="input mt-1"
            />
          </label>
          <label className={label}>
            Injuries or pain
            <textarea
              name="injuries"
              rows={2}
              maxLength={2000}
              defaultValue={o?.injuries ?? ""}
              placeholder="Past or current injuries, movements that hurt"
              className="input mt-1"
            />
          </label>
          <label className={label}>
            Medications
            <textarea
              name="medications"
              rows={2}
              maxLength={2000}
              defaultValue={o?.medications ?? ""}
              className="input mt-1"
            />
          </label>
        </Section>

        <Section title="Nutrition">
          <label className={label}>
            Dietary preferences, allergies and foods you avoid
            <textarea
              name="dietaryPreferences"
              rows={3}
              maxLength={2000}
              defaultValue={o?.dietaryPreferences ?? ""}
              placeholder="e.g. vegetarian, lactose intolerant, no seafood"
              className="input mt-1"
            />
          </label>
        </Section>

        <button className="btn w-full sm:w-auto">{done ? "Save changes" : "Finish onboarding"}</button>
      </form>
    </div>
  );
}
