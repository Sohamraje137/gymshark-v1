import Link from "next/link";
import type { Types } from "mongoose";
import { formatDateTime, lastLogDates } from "@/components/clients/data";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { addDays, formatDay, todayIn } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";
import { CheckIn, CLIENT_STATUSES, ClientProfile, CoachingSession, Message, User, type ClientStatus } from "@/models";

const INACTIVE_DAYS = 3;

/** Coach home page: upcoming calls and clients needing attention. */
export async function CoachDashboard({ user }: { user: CurrentUser }) {
  // "Today" is the server's local day; the coach has no time zone setting yet.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 8);

  const [sessions, awaitingReview, activeProfiles, threads, statusCounts] = await Promise.all([
    CoachingSession.find(
      { coach: user._id, status: "scheduled", startsAt: { $gte: startOfToday, $lt: weekEnd } },
      "client title startsAt endsAt meetUrl",
    )
      .sort({ startsAt: 1 })
      .limit(50)
      .lean(),
    CheckIn.find({ reviewedAt: null }, "client weekOf createdAt").sort({ weekOf: 1 }).limit(50).lean(),
    ClientProfile.find({ status: "active" }, "user timeZone").lean(),
    // Latest message of every conversation, keeping those where the client spoke last.
    Message.aggregate<{ _id: Types.ObjectId; body: string; createdAt: Date }>([
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$conversation", body: { $first: "$body" }, fromCoach: { $first: "$fromCoach" }, createdAt: { $first: "$createdAt" } } },
      { $match: { fromCoach: false } },
      { $sort: { createdAt: 1 } },
      { $limit: 50 },
    ]),
    ClientProfile.aggregate<{ _id: ClientStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const activeIds = activeProfiles.map((p) => p.user);
  const nameIds = [...sessions.map((s) => s.client), ...awaitingReview.map((c) => c.client), ...activeIds, ...threads.map((t) => t._id)];
  const [lastLogs, people] = await Promise.all([
    lastLogDates(activeIds),
    User.find({ _id: { $in: nameIds }, role: "client" }, "name email").lean(),
  ]);
  const nameOf = new Map(people.map((p) => [p._id.toString(), p.name || p.email]));
  const label = (id: Types.ObjectId) => nameOf.get(id.toString()) ?? "Unknown client";

  const todaysCalls = sessions.filter((s) => s.startsAt < startOfTomorrow);
  const laterCalls = sessions.filter((s) => s.startsAt >= startOfTomorrow);
  const quiet = activeProfiles
    .map((p) => ({ id: p.user, last: lastLogs.get(p.user.toString()), cutoff: addDays(todayIn(p.timeZone ?? "UTC"), -INACTIVE_DAYS) }))
    .filter((c) => !c.last || c.last <= c.cutoff)
    .sort((a, b) => (a.last ?? "").localeCompare(b.last ?? ""));
  // Only conversations that belong to a client (the coach inbox could include stray threads).
  const needsReply = threads.filter((t) => nameOf.has(t._id.toString()));
  const counts = new Map(statusCounts.map((s) => [s._id, s.count]));

  const callItem = (s: (typeof sessions)[number]) => (
    <li key={s._id.toString()} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <Link href={`/clients/${s.client}?tab=sessions`} className="font-medium hover:underline">
          {s.title}
        </Link>
        <p className="text-xs text-slate-500">
          {formatDateTime(s.startsAt)} · {label(s.client)}
        </p>
      </div>
      {s.meetUrl && (
        <a href={s.meetUrl} target="_blank" rel="noreferrer" className="btn-secondary">
          Join Meet
        </a>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <h1 className="page-title">Hi {user.name?.split(" ")[0] ?? "coach"} 👋</h1>

      <div className="flex flex-wrap gap-2">
        {CLIENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/clients?status=${s}`}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <span className="text-lg font-semibold">{counts.get(s) ?? 0}</span>
            <StatusBadge status={s} />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Calls</h2>
          <h3 className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Today</h3>
          {todaysCalls.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">No calls today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">{todaysCalls.map(callItem)}</ul>
          )}
          <h3 className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Next 7 days</h3>
          {laterCalls.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">{laterCalls.map(callItem)}</ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Check-ins to review ({awaitingReview.length})</h2>
          {awaitingReview.length === 0 && <p className="py-2 text-sm text-slate-500">All caught up.</p>}
          <ul className="divide-y divide-slate-100">
            {awaitingReview.map((c) => (
              <li key={c._id.toString()}>
                <Link href={`/clients/${c.client}?tab=check-ins`} className="flex justify-between gap-2 py-2 hover:underline">
                  <span className="font-medium">{label(c.client)}</span>
                  <span className="text-sm text-slate-500">week of {formatDay(c.weekOf)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-semibold">Needs reply ({needsReply.length})</h2>
          {needsReply.length === 0 && <p className="py-2 text-sm text-slate-500">No unanswered messages.</p>}
          <ul className="divide-y divide-slate-100">
            {needsReply.map((t) => (
              <li key={t._id.toString()}>
                <Link href={`/messages/${t._id}`} className="block py-2 hover:bg-slate-50">
                  <p className="flex justify-between gap-2">
                    <span className="font-medium">{label(t._id)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{t.createdAt.toLocaleDateString()}</span>
                  </p>
                  <p className="truncate text-sm text-slate-500">{t.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-semibold">Not logging ({quiet.length})</h2>
          <p className="text-xs text-slate-500">Active clients with no meals, workouts or activities in {INACTIVE_DAYS}+ days.</p>
          {quiet.length === 0 && <p className="py-2 text-sm text-slate-500">Everyone is logging.</p>}
          <ul className="divide-y divide-slate-100">
            {quiet.map((c) => (
              <li key={c.id.toString()}>
                <Link href={`/clients/${c.id}?tab=logs`} className="flex justify-between gap-2 py-2 hover:underline">
                  <span className="font-medium">{label(c.id)}</span>
                  <span className="text-sm text-slate-500">{c.last ? `last ${formatDay(c.last)}` : "never logged"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
