// Display helpers shared by the client's /log page and the coach's ClientLogsSummary.

type Num = number | null | undefined;

export type SetLike = { reps?: Num; weightKg?: Num; durationSec?: Num; distanceM?: Num; rpe?: Num };

const SOURCE_LABELS: Record<string, string> = { hevy: "Hevy", cronometer: "Cronometer", import: "Import" };

/** Badge text for imported entries, or null for manual ones. */
export function sourceLabel(source: string | null | undefined): string | null {
  if (!source || source === "manual") return null;
  return SOURCE_LABELS[source] ?? source;
}

/** Sum of the defined values of `key` across `items`. */
export function sumOf<T>(items: T[], pick: (item: T) => Num): number {
  return items.reduce((total, item) => total + (pick(item) ?? 0), 0);
}

/** Rounds to at most one decimal and adds thousands separators. */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function setText(s: SetLike): string {
  const parts: string[] = [];
  if (s.reps != null) parts.push(`${s.reps}`);
  if (s.durationSec != null) parts.push(s.durationSec >= 120 ? `${fmt(s.durationSec / 60)} min` : `${s.durationSec} s`);
  if (s.distanceM != null) parts.push(s.distanceM >= 1000 ? `${fmt(s.distanceM / 1000)} km` : `${fmt(s.distanceM)} m`);
  let text = parts.join(" / ");
  if (s.weightKg != null && s.weightKg > 0) text += ` @ ${fmt(s.weightKg)} kg`;
  if (s.rpe != null) text += ` RPE ${fmt(s.rpe)}`;
  return text.trim();
}

/** "3 × 8 @ 80 kg, 1 × 6 @ 82.5 kg": consecutive identical sets are grouped. */
export function formatSets(sets: SetLike[] | null | undefined): string {
  if (!sets?.length) return "";
  const groups: { text: string; count: number }[] = [];
  for (const s of sets) {
    const text = setText(s);
    const last = groups.at(-1);
    if (last && last.text === text) last.count++;
    else groups.push({ text, count: 1 });
  }
  return groups.map((g) => (g.text ? `${g.count} × ${g.text}` : `${g.count} ${g.count === 1 ? "set" : "sets"}`)).join(", ");
}

export type TargetKind = "goal" | "limit";
export type Tone = "good" | "over" | "under";

/**
 * How a day's value compares to the coach's target. "goal" targets (protein, steps) are met at 100%;
 * "limit" targets (calories, carbs, fat) are on track within ±10% and "over" above that.
 */
export function toneOf(value: number, target: number, kind: TargetKind): Tone {
  if (kind === "goal") return value >= target ? "good" : "under";
  if (value > target * 1.1) return "over";
  return value >= target * 0.9 ? "good" : "under";
}

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-700",
  over: "text-amber-700",
  under: "text-slate-700",
};

/** One-line summary of a meal's numbers, e.g. "420 kcal · P 32 g · C 50 g · F 10 g". */
export function macroLine(m: { calories?: Num; proteinG?: Num; carbsG?: Num; fatG?: Num }): string {
  return [
    m.calories != null && `${fmt(m.calories)} kcal`,
    m.proteinG != null && `P ${fmt(m.proteinG)} g`,
    m.carbsG != null && `C ${fmt(m.carbsG)} g`,
    m.fatG != null && `F ${fmt(m.fatG)} g`,
  ]
    .filter(Boolean)
    .join(" · ");
}
