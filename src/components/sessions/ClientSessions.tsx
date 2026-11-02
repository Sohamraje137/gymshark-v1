import { hasCalendarAccess } from "@/lib/google-calendar";
import { requireCoach } from "@/lib/session";
import { User } from "@/models";
import { loadSessions } from "./data";
import { ScheduleForm } from "./ScheduleForm";
import { SessionCard } from "./SessionCard";

/**
 * Coach-facing list of a client's past and upcoming calls, with a "schedule call" form.
 * Rendered on /clients/[clientId]. Owned by the scheduling feature.
 */
export async function ClientSessions({ clientId }: { clientId: string }) {
  const coach = await requireCoach(); // the page checks too; cheap (cached) and keeps this safe to embed
  if (!/^[a-f0-9]{24}$/i.test(clientId)) return null;
  const now = new Date();

  const [client, upcoming, past, googleConnected] = await Promise.all([
    User.findOne({ _id: clientId, role: "client" }, "name email").lean(),
    loadSessions({ client: clientId, endsAt: { $gte: now } }, { sort: 1, limit: 50 }),
    loadSessions({ client: clientId, endsAt: { $lt: now } }, { sort: -1, limit: 20 }),
    hasCalendarAccess(coach.id),
  ]);
  if (!client) return null;
  const name = client.name || client.email;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Upcoming calls</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <SessionCard session={s} now={now.getTime()} viewer="coach" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Past calls</h3>
          {past.length === 0 ? (
            <p className="text-sm text-slate-500">No past calls.</p>
          ) : (
            <ul className="space-y-3">
              {past.map((s) => (
                <li key={s.id}>
                  <SessionCard session={s} now={now.getTime()} viewer="coach" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Schedule a call</h3>
        <ScheduleForm fixedClient={{ id: clientId, name }} googleConnected={googleConnected} />
      </section>
    </div>
  );
}
