import { formatDay } from "@/lib/dates";

/** The five 1–5 ratings on a weekly check-in, with what 1 and 5 mean. */
export const RATINGS = [
  { name: "energy", label: "Energy", low: "low", high: "high" },
  { name: "sleepQuality", label: "Sleep quality", low: "poor", high: "great" },
  { name: "stress", label: "Stress", low: "low", high: "high" },
  { name: "hunger", label: "Hunger", low: "low", high: "high" },
  { name: "adherence", label: "Plan adherence", low: "off track", high: "on point" },
] as const;

export type RatingName = (typeof RATINGS)[number]["name"];

/** The fields of a CheckIn document that the UI shows (lean query result). */
export type CheckInView = {
  weekOf: string;
  weightKg?: number | null;
  waistCm?: number | null;
  wins?: string | null;
  struggles?: string | null;
  questions?: string | null;
  coachFeedback?: string | null;
  reviewedAt?: Date | null;
} & { [K in RatingName]?: number | null };

/**
 * Weight change of each check-in vs the previous (older) check-in that has a weight.
 * `newestFirst` must be sorted by weekOf descending. Returns deltas in the same order.
 */
export function weightDeltas(newestFirst: CheckInView[]): (number | null)[] {
  return newestFirst.map((c, i) => {
    if (c.weightKg == null) return null;
    const prev = newestFirst.slice(i + 1).find((p) => p.weightKg != null);
    return prev ? Math.round((c.weightKg - prev.weightKg!) * 10) / 10 : null;
  });
}

export function weekLabel(weekOf: string) {
  return `Week of ${formatDay(weekOf)}`;
}

function formatDelta(delta: number) {
  if (delta === 0) return "±0 kg";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} kg`;
}

/** Read-only view of a check-in's measurements, ratings, notes and (optionally) the coach's feedback. */
export function CheckInDetails({
  checkIn: c,
  weightDelta,
  showFeedback = true,
}: {
  checkIn: CheckInView;
  weightDelta: number | null;
  showFeedback?: boolean;
}) {
  const notes = [
    { label: "Wins", value: c.wins },
    { label: "Struggles", value: c.struggles },
    { label: "Questions for the coach", value: c.questions },
  ].filter((n) => n.value);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <p>
          <span className="text-slate-500">Weight </span>
          <span className="font-medium">{c.weightKg != null ? `${c.weightKg} kg` : "–"}</span>
          {weightDelta != null && <span className="ml-1 text-slate-500">({formatDelta(weightDelta)})</span>}
        </p>
        <p>
          <span className="text-slate-500">Waist </span>
          <span className="font-medium">{c.waistCm != null ? `${c.waistCm} cm` : "–"}</span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {RATINGS.map((r) => (
          <li key={r.name} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
            {r.label} <span className="font-semibold">{c[r.name] ?? "–"}</span>/5
          </li>
        ))}
      </ul>

      {notes.map((n) => (
        <div key={n.label}>
          <p className="text-xs font-medium text-slate-500">{n.label}</p>
          <p className="whitespace-pre-wrap text-slate-700">{n.value}</p>
        </div>
      ))}

      {showFeedback && c.coachFeedback && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-xs font-medium text-indigo-700">Coach feedback</p>
          <p className="whitespace-pre-wrap text-indigo-950">{c.coachFeedback}</p>
        </div>
      )}
    </div>
  );
}
