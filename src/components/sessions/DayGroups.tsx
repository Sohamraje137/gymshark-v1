"use client";

import type { ReactNode } from "react";
import { addDays, formatDay, todayIn } from "@/lib/dates";
import { useBrowserTimeZone } from "./useBrowserTimeZone";

/**
 * Groups server-rendered items under day headings in the viewer's own time zone
 * (UTC until hydrated). Items keep the order they are given in.
 */
export function DayGroups({
  items,
  nowIso,
  empty,
}: {
  items: { key: string; at: string; node: ReactNode }[];
  nowIso: string;
  empty: string;
}) {
  const timeZone = useBrowserTimeZone() || "UTC";
  if (items.length === 0) return <p className="card text-sm text-slate-500">{empty}</p>;

  const today = todayIn(timeZone, new Date(nowIso));
  const groups = new Map<string, ReactNode[]>();
  for (const item of items) {
    const day = todayIn(timeZone, new Date(item.at));
    groups.set(day, [...(groups.get(day) ?? []), <li key={item.key}>{item.node}</li>]);
  }
  const label = (day: string) =>
    day === today
      ? `Today · ${formatDay(day)}`
      : day === addDays(today, 1)
        ? `Tomorrow · ${formatDay(day)}`
        : day === addDays(today, -1)
          ? `Yesterday · ${formatDay(day)}`
          : formatDay(day);

  return (
    <div className="space-y-5">
      {[...groups].map(([day, nodes]) => (
        <section key={day}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{label(day)}</h3>
          <ul className="space-y-3">{nodes}</ul>
        </section>
      ))}
    </div>
  );
}
