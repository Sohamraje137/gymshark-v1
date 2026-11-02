import type { calendar_v3 } from "@googleapis/calendar";

/** Upcoming Google Calendar events, formatted in the calendar's own time zone. */
export function EventList({ events, timeZone }: { events: calendar_v3.Schema$Event[]; timeZone: string }) {
  if (events.length === 0) return <p className="text-sm text-slate-500">No upcoming events.</p>;

  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" });
  const dateOnly = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "medium" });

  return (
    <ul className="divide-y divide-slate-100">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-medium">{e.summary ?? "(no title)"}</p>
            <p className="text-xs text-slate-500">
              {e.start?.dateTime
                ? fmt.format(new Date(e.start.dateTime))
                : e.start?.date
                  ? `${dateOnly.format(new Date(e.start.date))} · all day`
                  : ""}
            </p>
          </div>
          {e.htmlLink && (
            <a href={e.htmlLink} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-indigo-600 hover:underline">
              Open
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
