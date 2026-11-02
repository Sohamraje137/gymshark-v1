import Link from "next/link";
import { formatDay } from "@/lib/dates";
import { CheckIn, ClientProfile, CoachNote } from "@/models";
import { updateTargets } from "../actions";

const ONBOARDING_FIELDS = [
  { key: "goals", label: "Goals" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "sex", label: "Sex" },
  { key: "heightCm", label: "Height", unit: "cm" },
  { key: "startWeightKg", label: "Start weight", unit: "kg" },
  { key: "targetWeightKg", label: "Target weight", unit: "kg" },
  { key: "activityLevel", label: "Activity level" },
  { key: "trainingExperience", label: "Training experience" },
  { key: "healthConditions", label: "Health conditions" },
  { key: "injuries", label: "Injuries" },
  { key: "medications", label: "Medications" },
  { key: "dietaryPreferences", label: "Dietary preferences" },
  { key: "availability", label: "Availability" },
] as const;

const TARGET_INPUTS = [
  { key: "calories", label: "Calories", unit: "kcal/day", step: "1" },
  { key: "proteinG", label: "Protein", unit: "g/day", step: "any" },
  { key: "carbsG", label: "Carbs", unit: "g/day", step: "any" },
  { key: "fatG", label: "Fat", unit: "g/day", step: "any" },
  { key: "steps", label: "Steps", unit: "per day", step: "1" },
  { key: "workoutsPerWeek", label: "Workouts", unit: "per week", step: "1" },
] as const;

const fmtKg = (n: number) => `${Math.round(n * 10) / 10} kg`;

export async function OverviewTab({ clientId }: { clientId: string }) {
  const [profile, firstWeighIn, latestWeighIn, pinned] = await Promise.all([
    ClientProfile.findOne({ user: clientId }, "onboarding targets").lean(),
    CheckIn.findOne({ client: clientId, weightKg: { $ne: null } }, "weekOf weightKg").sort({ weekOf: 1 }).lean(),
    CheckIn.findOne({ client: clientId, weightKg: { $ne: null } }, "weekOf weightKg").sort({ weekOf: -1 }).lean(),
    CoachNote.find({ client: clientId, pinned: true }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const onboarding = profile?.onboarding;
  const targets = profile?.targets;
  const answers = ONBOARDING_FIELDS.filter((f) => onboarding?.[f.key] != null && onboarding[f.key] !== "");
  const targetWeight = onboarding?.targetWeightKg;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-3 lg:row-span-3">
        <h2 className="font-semibold">Onboarding</h2>
        {onboarding?.completedAt ? (
          <p className="text-xs text-slate-500">Completed {onboarding.completedAt.toLocaleDateString()}</p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Not onboarded yet</p>
        )}
        {answers.length > 0 && (
          <dl className="space-y-2 text-sm">
            {answers.map((f) => (
              <div key={f.key}>
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="whitespace-pre-wrap">
                  {String(onboarding?.[f.key]).replaceAll("_", " ")}
                  {"unit" in f && ` ${f.unit}`}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Weight trend</h2>
        {firstWeighIn?.weightKg != null && latestWeighIn?.weightKg != null ? (
          <>
            <p className="text-sm">
              {fmtKg(firstWeighIn.weightKg)} <span className="text-slate-400">(week of {formatDay(firstWeighIn.weekOf)})</span>
              {" → "}
              <span className="font-semibold">{fmtKg(latestWeighIn.weightKg)}</span>{" "}
              <span className="text-slate-400">(week of {formatDay(latestWeighIn.weekOf)})</span>
            </p>
            <p className="text-sm text-slate-600">
              Change:{" "}
              <span className="font-medium">
                {latestWeighIn.weightKg - firstWeighIn.weightKg > 0 ? "+" : ""}
                {fmtKg(latestWeighIn.weightKg - firstWeighIn.weightKg)}
              </span>
              {targetWeight != null && <> · {fmtKg(Math.abs(latestWeighIn.weightKg - targetWeight))} from target ({fmtKg(targetWeight)})</>}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">No weigh-ins from check-ins yet.</p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Targets</h2>
        <form action={updateTargets.bind(null, clientId)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TARGET_INPUTS.map((t) => (
              <label key={t.key} className="block text-sm">
                <span className="text-slate-700">{t.label}</span>
                <input
                  name={t.key}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={t.step}
                  defaultValue={targets?.[t.key] ?? ""}
                  className="input mt-1"
                />
                <span className="text-xs text-slate-400">{t.unit}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Leave a field empty to clear that target.</p>
          <button className="btn">Save targets</button>
        </form>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pinned notes</h2>
          <Link href={`/clients/${clientId}?tab=notes`} className="text-sm text-indigo-600 hover:underline">
            All notes
          </Link>
        </div>
        {pinned.length === 0 && <p className="text-sm text-slate-500">No pinned notes.</p>}
        {pinned.map((n) => (
          <p key={n._id.toString()} className="rounded-lg bg-amber-50 px-3 py-2 text-sm whitespace-pre-wrap">
            {n.body}
          </p>
        ))}
      </section>
    </div>
  );
}
