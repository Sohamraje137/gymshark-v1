import Link from "next/link";
import { fmt, formatSets, macroLine, sumOf, toneOf, TONE_TEXT, type TargetKind, type Tone } from "@/components/logs/format";
import { SourceBadge } from "@/components/logs/SourceBadge";
import { addDays, formatDay, mondayOf, todayIn } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { ACTIVITY_TYPES, ActivityLog, ClientProfile, MEAL_TYPES, MealLog, WorkoutLog } from "@/models";
import { ActivityFields } from "./ActivityFields";
import { addActivity, addMeal, addWorkout, deleteLog } from "./actions";
import { ExerciseRows } from "./ExerciseRows";
import { isDay, LIMITS } from "./shared";

export const metadata = { title: "Log" };

const BAR: Record<Tone, string> = { good: "bg-emerald-500", over: "bg-amber-500", under: "bg-indigo-500" };
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Meal type to pre-select, from the current hour in the client's time zone. */
function mealTypeForNow(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id }).select("timeZone targets").lean();
  const timeZone = profile?.timeZone || "UTC";
  const targets = profile?.targets ?? {};
  const today = todayIn(timeZone);

  const { date: param } = await searchParams;
  const valid = isDay(param) && param <= today;
  const day = valid ? param : today;
  const from = addDays(day, -6); // the 7-day strip; also covers Monday of `day`'s week

  const range = { client: user._id, date: { $gte: from, $lte: day } };
  const [allMeals, allWorkouts, allActivities] = await Promise.all([
    MealLog.find(range).sort({ createdAt: 1 }).lean(),
    WorkoutLog.find(range).sort({ createdAt: 1 }).lean(),
    ActivityLog.find(range).sort({ createdAt: 1 }).lean(),
  ]);

  const meals = allMeals.filter((m) => m.date === day);
  const workouts = allWorkouts.filter((w) => w.date === day);
  const activities = allActivities.filter((a) => a.date === day);

  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const dayMeals = allMeals.filter((m) => m.date === d);
    const logged =
      dayMeals.length > 0 || allWorkouts.some((w) => w.date === d) || allActivities.some((a) => a.date === d);
    return { day: d, logged, hasCalories: dayMeals.some((m) => m.calories != null), calories: sumOf(dayMeals, (m) => m.calories) };
  });

  const totals = {
    calories: sumOf(meals, (m) => m.calories),
    proteinG: sumOf(meals, (m) => m.proteinG),
    carbsG: sumOf(meals, (m) => m.carbsG),
    fatG: sumOf(meals, (m) => m.fatG),
    steps: sumOf(
      activities.filter((a) => a.type === "steps"),
      (a) => a.value,
    ),
  };
  const monday = mondayOf(day);
  const weekWorkouts = allWorkouts.filter((w) => w.date >= monday).length;

  const targetRows: { label: string; value: number; target?: number | null; unit: string; kind: TargetKind }[] = [
    { label: "Calories", value: totals.calories, target: targets.calories, unit: "kcal", kind: "limit" },
    { label: "Protein", value: totals.proteinG, target: targets.proteinG, unit: "g", kind: "goal" },
    { label: "Carbs", value: totals.carbsG, target: targets.carbsG, unit: "g", kind: "limit" },
    { label: "Fat", value: totals.fatG, target: targets.fatG, unit: "g", kind: "limit" },
    { label: "Steps", value: totals.steps, target: targets.steps, unit: "", kind: "goal" },
    { label: "Workouts this week", value: weekWorkouts, target: targets.workoutsPerWeek, unit: "", kind: "goal" },
  ];
  const shownTargets = targetRows.filter((r) => r.target != null && r.target > 0);
  const dayLabel = day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : null;

  return (
    <div className="space-y-4">
      <h1 className="page-title mb-2">Log</h1>
      {param !== undefined && !valid && (
        <p className="text-sm text-amber-700">That date isn&apos;t valid, so you&apos;re seeing today.</p>
      )}

      {/* Day picker */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/log?date=${addDays(day, -1)}`} className="btn-secondary" aria-label="Previous day">
          ‹ Prev
        </Link>
        <div className="text-center">
          <p className="font-semibold">{formatDay(day)}</p>
          {dayLabel ? (
            <p className="text-xs text-slate-500">{dayLabel}</p>
          ) : (
            <Link href="/log" className="text-xs text-indigo-600 hover:underline">
              Back to today
            </Link>
          )}
        </div>
        {day < today ? (
          <Link href={`/log?date=${addDays(day, 1)}`} className="btn-secondary" aria-label="Next day">
            Next ›
          </Link>
        ) : (
          <span className="btn-secondary invisible" aria-hidden>
            Next ›
          </span>
        )}
      </div>

      <nav aria-label="Last 7 days" className="grid grid-cols-7 gap-1">
        {strip.map((s) => {
          const tone = s.hasCalories && targets.calories ? toneOf(s.calories, targets.calories, "limit") : null;
          const [weekday, , date] = formatDay(s.day).replace(",", "").split(" ");
          return (
            <Link
              key={s.day}
              href={`/log?date=${s.day}`}
              aria-current={s.day === day ? "date" : undefined}
              className={`flex flex-col items-center rounded-lg border px-0.5 py-1.5 text-center ${
                s.day === day ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="text-[11px] text-slate-500">{weekday}</span>
              <span className="text-sm font-semibold">{date}</span>
              <span
                className={`my-0.5 h-1.5 w-1.5 rounded-full ${s.logged ? "bg-indigo-500" : "bg-slate-200"}`}
                title={s.logged ? "Logged" : "Nothing logged"}
              />
              <span className={`text-[11px] tabular-nums ${tone ? TONE_TEXT[tone] : "text-slate-400"}`}>
                {s.hasCalories ? fmt(Math.round(s.calories)) : "–"}
              </span>
            </Link>
          );
        })}
      </nav>
      {targets.calories ? (
        <p className="-mt-2 text-[11px] text-slate-500">
          kcal per day vs {fmt(targets.calories)} target ·{" "}
          <span className="text-emerald-700">on track</span> · <span className="text-amber-700">over</span>
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_340px] md:items-start">
        {/* Side column: totals + add forms. First on phones. */}
        <div className="space-y-4 md:col-start-2 md:row-start-1">
          <section className="card space-y-3 p-4">
            <h2 className="font-medium">Day totals</h2>
            {shownTargets.length === 0 ? (
              <>
                <p className="text-sm text-slate-700">
                  {macroLine({ calories: totals.calories, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG })}
                  {totals.steps > 0 && ` · ${fmt(totals.steps)} steps`}
                </p>
                <p className="text-xs text-slate-500">Your coach hasn&apos;t set targets yet.</p>
              </>
            ) : (
              shownTargets.map((r) => {
                const target = r.target as number;
                const tone = toneOf(r.value, target, r.kind);
                const pct = Math.min(100, (r.value / target) * 100);
                return (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="tabular-nums">
                        <span className={tone === "over" ? "font-medium text-amber-700" : "font-medium"}>
                          {fmt(Math.round(r.value))}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          / {fmt(target)} {r.unit}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <details className="card p-0">
            <summary className="cursor-pointer px-4 py-3 font-medium">Add meal</summary>
            <form action={addMeal} className="space-y-2 border-t border-slate-100 px-4 pt-3 pb-4">
              <input type="hidden" name="date" value={day} />
              <select
                name="mealType"
                aria-label="Meal type"
                defaultValue={day === today ? mealTypeForNow(timeZone) : "breakfast"}
                className="input"
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {capitalize(t)}
                  </option>
                ))}
              </select>
              <input name="description" required maxLength={1000} placeholder="What did you eat?" className="input" />
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["calories", "kcal", LIMITS.calories],
                    ["proteinG", "Protein g", LIMITS.macroG],
                    ["carbsG", "Carbs g", LIMITS.macroG],
                    ["fatG", "Fat g", LIMITS.macroG],
                  ] as const
                ).map(([name, label, max]) => (
                  <label key={name} className="text-xs text-slate-500">
                    {label}
                    <input
                      name={name}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={max}
                      step="any"
                      className="input mt-0.5 px-2"
                    />
                  </label>
                ))}
              </div>
              <button className="btn w-full">Add meal</button>
            </form>
          </details>

          <details className="card p-0">
            <summary className="cursor-pointer px-4 py-3 font-medium">Add workout</summary>
            <form action={addWorkout} className="space-y-2 border-t border-slate-100 px-4 pt-3 pb-4">
              <input type="hidden" name="date" value={day} />
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <label className="text-xs text-slate-500">
                  Title
                  <input name="title" required maxLength={200} placeholder="e.g. Upper body" className="input mt-0.5" />
                </label>
                <label className="text-xs text-slate-500">
                  Minutes
                  <input
                    name="durationMin"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={LIMITS.durationMin}
                    step="any"
                    className="input mt-0.5"
                  />
                </label>
              </div>
              <ExerciseRows />
              <input name="notes" maxLength={2000} placeholder="Notes (optional)" className="input" />
              <button className="btn w-full">Add workout</button>
            </form>
          </details>

          <details className="card p-0">
            <summary className="cursor-pointer px-4 py-3 font-medium">Add activity</summary>
            <form action={addActivity} className="space-y-2 border-t border-slate-100 px-4 pt-3 pb-4">
              <input type="hidden" name="date" value={day} />
              <ActivityFields types={ACTIVITY_TYPES} />
              <input name="notes" maxLength={1000} placeholder="Notes (optional), e.g. Yoga class" className="input" />
              <button className="btn w-full">Add activity</button>
            </form>
          </details>
        </div>

        {/* Main column: the day's entries. */}
        <div className="space-y-4 md:col-start-1 md:row-start-1">
          <section className="card p-4">
            <h2 className="font-medium">Meals</h2>
            {meals.length === 0 && <p className="mt-2 text-sm text-slate-500">No meals logged.</p>}
            {MEAL_TYPES.filter((t) => meals.some((m) => m.mealType === t)).map((t) => (
              <div key={t} className="mt-3">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t}</h3>
                <ul className="divide-y divide-slate-100">
                  {meals
                    .filter((m) => m.mealType === t)
                    .map((m) => (
                      <li key={m._id.toString()} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm break-words">
                            {m.description}
                            <SourceBadge source={m.source} />
                          </p>
                          {macroLine(m) && <p className="text-xs text-slate-500 tabular-nums">{macroLine(m)}</p>}
                          {m.notes && <p className="text-xs text-slate-500 italic">{m.notes}</p>}
                        </div>
                        <DeleteButton action={deleteLog.bind(null, "meal", m._id.toString())} what={m.description} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="card p-4">
            <h2 className="font-medium">Workouts</h2>
            {workouts.length === 0 && <p className="mt-2 text-sm text-slate-500">No workouts logged.</p>}
            <ul className="divide-y divide-slate-100">
              {workouts.map((w) => (
                <li key={w._id.toString()} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {w.title}
                      {w.durationMin != null && (
                        <span className="font-normal text-slate-500"> · {fmt(w.durationMin)} min</span>
                      )}
                      <SourceBadge source={w.source} />
                    </p>
                    {w.exercises.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {w.exercises.map((e, i) => (
                          <li key={i}>
                            {e.name}
                            {e.sets.length > 0 && <span className="text-slate-500"> · {formatSets(e.sets)}</span>}
                            {e.notes && <span className="text-xs text-slate-500 italic"> ({e.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {w.notes && <p className="mt-1 text-xs text-slate-500 italic">{w.notes}</p>}
                  </div>
                  <DeleteButton action={deleteLog.bind(null, "workout", w._id.toString())} what={w.title} />
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="font-medium">Activities</h2>
            {activities.length === 0 && <p className="mt-2 text-sm text-slate-500">No activities logged.</p>}
            <ul className="divide-y divide-slate-100">
              {activities.map((a) => (
                <li key={a._id.toString()} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{capitalize(a.type)}</span>
                      {a.value != null && (
                        <span className="tabular-nums">
                          {" "}
                          · {fmt(a.value)} {a.unit}
                        </span>
                      )}
                      <SourceBadge source={a.source} />
                    </p>
                    {a.notes && <p className="text-xs text-slate-500 italic">{a.notes}</p>}
                  </div>
                  <DeleteButton action={deleteLog.bind(null, "activity", a._id.toString())} what={capitalize(a.type)} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ action, what }: { action: () => Promise<void>; what: string }) {
  return (
    <form action={action} className="shrink-0">
      <button className="btn-danger px-2 py-1 text-xs" aria-label={`Delete ${what}`}>
        Delete
      </button>
    </form>
  );
}
