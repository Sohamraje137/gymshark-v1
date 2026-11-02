"use client";

import type { ReactNode } from "react";
import { addDays, formatDay, todayIn } from "@/lib/dates";
import { useBrowserTimeZone } from "./useBrowserTimeZone";

/**
 * Groups server-rendered items under day headings in the viewer's own time zone (UTC until hydrated).
 * Items keep the order they are given in. Headings and items are keyed siblings in one list, so an item
 * that moves to another day (reschedule) keeps its client state, e.g. a warning message.
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
  const label = (day: string) => {
    const prefix = { [today]: "Today · ", [addDays(today, 1)]: "Tomorrow · ", [addDays(today, -1)]: "Yesterday · " }[day];
    return `${prefix ?? ""}${formatDay(day)}`;
  };

  const children: ReactNode[] = [];
  let lastDay = "";
  for (const item of items) {
    const day = todayIn(timeZone, new Date(item.at));
    if (day !== lastDay) {
      children.push(
        <h3 key={`day-${day}`} className="pt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase first:pt-0">
          {label(day)}
        </h3>,
      );
      lastDay = day;
    }
    children.push(<div key={item.key}>{item.node}</div>);
  }
  return <div className="space-y-3">{children}</div>;
}
