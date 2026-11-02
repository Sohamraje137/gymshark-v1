// Day strings ("YYYY-MM-DD") are always in the client's own time zone. See AGENTS.md.

/** Today's date as "YYYY-MM-DD" in the given IANA time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Adds `days` (may be negative) to a "YYYY-MM-DD" string. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `day` (weeks start on Monday). */
export function mondayOf(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/** "Mon, Nov 2" style label for a day string. */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

// ---------- Exact instants and IANA time zones (call times) ----------

/** True if `timeZone` is an IANA zone name this runtime knows, e.g. "America/New_York". */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock fields of `date` in `timeZone`. */
function wallClock(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** UTC offset of `timeZone` at the instant `ms`, in milliseconds (e.g. -5h for New York in winter). */
function offsetAt(ms: number, timeZone: string): number {
  const w = wallClock(new Date(ms), timeZone);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return wallAsUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * Converts a wall-clock time "YYYY-MM-DDTHH:mm" (the value of <input type="datetime-local">) in an IANA
 * time zone to the exact instant. DST is handled like Temporal's "compatible" mode: a time that occurs
 * twice (clocks go back) resolves to the earlier instant; a time that is skipped (clocks go forward)
 * moves forward by the gap, e.g. 02:30 on a spring-forward night becomes 03:30.
 */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error(`Invalid local date-time: ${local}`);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Offsets a day either side; at most one DST transition happens in between.
  const before = offsetAt(wall - 864e5, timeZone);
  const after = offsetAt(wall + 864e5, timeZone);
  const valid = [...new Set([before, after])]
    .map((offset) => wall - offset)
    .filter((ms) => wall - offsetAt(ms, timeZone) === ms)
    .sort((a, b) => a - b);
  // No valid candidate: the time falls in a spring-forward gap. Use the pre-transition offset.
  return new Date(valid[0] ?? wall - before);
}

/** "YYYY-MM-DDTHH:mm" for `date` in `timeZone`, e.g. to prefill <input type="datetime-local">. */
export function toZonedInputValue(date: Date, timeZone: string): string {
  const w = wallClock(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}
