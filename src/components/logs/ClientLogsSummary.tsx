import { isValidObjectId } from "mongoose";
import { addDays, formatDay, todayIn } from "@/lib/dates";
import { connectDB } from "@/lib/db";
import { ActivityLog, ClientProfile, MealLog, WorkoutLog } from "@/models";
import { fmt, formatSets, sumOf, toneOf, TONE_TEXT, type TargetKind } from "./format";
import { SourceBadge } from "./SourceBadge";

/**
 * Coach-facing summary of a client's recent meals, workouts and activities.
 * Rendered on /clients/[clientId]. Owned by the client-logging feature.
 * The embedding page performs the coach authorization check.
 */
export async function ClientLogsSummary({ clientId }: { clientId: string }) {
  if (!isValidObjectId(clientId)) return null;
  await connectDB();

  const profile = await ClientProfile.findOne({ user: clientId }).select("timeZone targets").lean();
  const targets = profile?.targets ?? {};
  const today = todayIn(profile?.timeZone || "UTC");
  const from = addDays(today, -6);
  const range = { client: clientId, date: { $gte: from, $lte: today } };

  const [meals, weekWorkouts, steps, recentWorkouts] = await Promise.all([
    MealLog.find(range).select("date calories proteinG").lean(),
    WorkoutLog.find(range).select("date").lean(),
    ActivityLog.find({ ...range, type: "steps" }).select("date value").lean(),
    WorkoutLog.find({ client: clientId }).sort({ date: -1, createdAt: -1 }).limit(5).lean(),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, -i); // newest first
    const dayMeals = meals.filter((m) => m.date === day);
    const daySteps = steps.filter((s) => s.date === day);
    return {
      day,
      calories: dayMeals.some((m) => m.calories != null) ? sumOf(dayMeals, (m) => m.calories) : null,
      proteinG: dayMeals.some((m) => m.proteinG != null) ? sumOf(dayMeals, (m) => m.proteinG) : null,
      workouts: weekWorkouts.filter((w) => w.date === day).length,
      steps: daySteps.length ? sumOf(daySteps, (s) => s.value) : null,
    };
  });

  const cell = (value: number | null, target: number | null | undefined, kind: TargetKind) => {
    if (value == null) return <span className="text-slate-400">–</span>;
    const tone = target ? toneOf(value, target, kind) : null;
    return <span className={tone ? TONE_TEXT[tone] : undefined}>{fmt(Math.round(value))}</span>;
  };
  const targetLabel = (target: number | null | undefined, unit = "") =>
    target ? <span className="block text-[10px] font-normal text-slate-400">/ {fmt(target)}{unit}</span> : null;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Last 7 days
          {targets.workoutsPerWeek ? (
            <span className="font-normal text-slate-500">
              {" "}
              · {weekWorkouts.length} workouts (target {targets.workoutsPerWeek}/week)
            </span>
          ) : null}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Day</th>
                <th className="py-1.5 pr-3 text-right font-medium">kcal{targetLabel(targets.calories)}</th>
                <th className="py-1.5 pr-3 text-right font-medium">Protein{targetLabel(targets.proteinG, " g")}</th>
                <th className="py-1.5 pr-3 text-right font-medium">Workouts</th>
                <th className="py-1.5 text-right font-medium">Steps{targetLabel(targets.steps)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((d) => (
                <tr key={d.day}>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{d.day === today ? "Today" : formatDay(d.day)}</td>
                  <td className="py-1.5 pr-3 text-right">{cell(d.calories, targets.calories, "limit")}</td>
                  <td className="py-1.5 pr-3 text-right">{cell(d.proteinG, targets.proteinG, "goal")}</td>
                  <td className="py-1.5 pr-3 text-right">{d.workouts || <span className="text-slate-400">–</span>}</td>
                  <td className="py-1.5 text-right">{cell(d.steps, targets.steps, "goal")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent workouts</h3>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-slate-500">No workouts logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentWorkouts.map((w) => (
              <li key={w._id.toString()} className="text-sm">
                <p className="font-medium">
                  {w.title}
                  <span className="font-normal text-slate-500">
                    {" "}
                    · {formatDay(w.date)}
                    {w.durationMin != null && ` · ${fmt(w.durationMin)} min`}
                  </span>
                  <SourceBadge source={w.source} />
                </p>
                {w.exercises.length > 0 && (
                  <ul className="mt-0.5 text-slate-700">
                    {w.exercises.map((e, i) => (
                      <li key={i}>
                        {e.name}
                        {e.sets.length > 0 && <span className="text-slate-500"> · {formatSets(e.sets)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {w.notes && <p className="text-xs text-slate-500 italic">{w.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
