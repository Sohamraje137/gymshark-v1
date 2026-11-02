"use client";

import { useBrowserTimeZone } from "./useBrowserTimeZone";

const STYLES = {
  time: { hour: "numeric", minute: "2-digit" },
  datetime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * An instant formatted in the viewer's own (browser) time zone. Before hydration it shows UTC, labelled.
 * `end` adds "– 6:30 PM".
 */
export function LocalTime({ iso, end, mode = "datetime" }: { iso: string; end?: string; mode?: keyof typeof STYLES }) {
  const tz = useBrowserTimeZone();
  const timeZone = tz || "UTC";
  const fmt = new Intl.DateTimeFormat("en-US", { ...STYLES[mode], timeZone });
  const endFmt = new Intl.DateTimeFormat("en-US", { ...STYLES.time, timeZone });
  return (
    <time dateTime={iso}>
      {fmt.format(new Date(iso))}
      {end && `–${endFmt.format(new Date(end))}`}
      {!tz && " UTC"}
    </time>
  );
}
