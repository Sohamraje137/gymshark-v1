import Link from "next/link";
import { SESSION_STATUS_BADGE, SESSION_TYPE_BADGE, SESSION_TYPE_LABELS, type SessionView } from "./constants";
import { LocalTime } from "./LocalTime";
import { SessionActions } from "./SessionActions";

/**
 * One call. Coaches see client name, private outcome and actions, with times in their browser's zone.
 * Clients pass `timeZone` (their ClientProfile zone) and never receive the outcome.
 */
export function SessionCard({
  session: s,
  now,
  viewer,
  showClient = false,
  timeZone,
}: {
  session: SessionView;
  now: number;
  viewer: "coach" | "client";
  showClient?: boolean;
  timeZone?: string;
}) {
  const isCoach = viewer === "coach";
  const canJoin = s.status === "scheduled" && s.meetUrl && Date.parse(s.endsAt) >= now;
  const isMeet = s.meetUrl?.startsWith("https://meet.google.com/");

  return (
    <article className={`card p-4 ${s.status === "cancelled" ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${SESSION_TYPE_BADGE[s.type]}`}>
              {SESSION_TYPE_LABELS[s.type]}
            </span>
            {s.status !== "scheduled" && (
              <span className={`rounded-full px-2 py-0.5 ${SESSION_STATUS_BADGE[s.status]}`}>{s.status}</span>
            )}
          </div>
          {showClient ? (
            <p className="mt-1.5 truncate font-medium">
              <Link href={`/clients/${s.clientId}?tab=sessions`} className="hover:text-indigo-600 hover:underline">
                {s.clientName}
              </Link>
              <span className="font-normal text-slate-500"> · {s.title}</span>
            </p>
          ) : (
            <p className="mt-1.5 font-medium">{s.title}</p>
          )}
          <p className={`text-sm text-slate-600 ${s.status === "cancelled" ? "line-through" : ""}`}>
            {timeZone ? formatRange(s.startsAt, s.endsAt, timeZone) : <LocalTime iso={s.startsAt} end={s.endsAt} />}
            {!isCoach && s.coachName && <span className="text-slate-500"> · with {s.coachName}</span>}
          </p>
        </div>
        {canJoin && (
          <a href={s.meetUrl} target="_blank" rel="noreferrer" className="btn shrink-0">
            {isMeet ? "Join Meet" : "Join call"}
          </a>
        )}
      </div>
      {s.agenda && (
        <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">
          <span className="font-medium text-slate-700">Agenda: </span>
          {s.agenda}
        </p>
      )}
      {isCoach && s.outcome && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-700">
          <span className="font-medium">Outcome (private): </span>
          {s.outcome}
        </p>
      )}
      {isCoach && s.meetUrl && !canJoin && s.status === "scheduled" && (
        <a href={s.meetUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-indigo-600 hover:underline">
          {s.meetUrl}
        </a>
      )}
      {isCoach && (
        <SessionActions
          sessionId={s.id}
          status={s.status}
          startsAt={s.startsAt}
          endsAt={s.endsAt}
          outcome={s.outcome}
        />
      )}
    </article>
  );
}

function formatRange(startIso: string, endIso: string, timeZone: string) {
  const start = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${start.format(new Date(startIso))}–${end.format(new Date(endIso))}`;
}
