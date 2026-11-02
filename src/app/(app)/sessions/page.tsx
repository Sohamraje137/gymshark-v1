import { loadSessions } from "@/components/sessions/data";
import { SessionCard } from "@/components/sessions/SessionCard";
import { isValidTimeZone } from "@/lib/dates";
import { requireClient } from "@/lib/session";
import { ClientProfile } from "@/models";

export const metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const user = await requireClient();
  const profile = await ClientProfile.findOne({ user: user._id }, "timeZone").lean();
  const timeZone = profile?.timeZone && isValidTimeZone(profile.timeZone) ? profile.timeZone : "UTC";
  const now = new Date();

  // forClient: the coach's private outcome notes are never loaded.
  const [upcoming, past] = await Promise.all([
    loadSessions({ client: user._id, endsAt: { $gte: now } }, { sort: 1, limit: 50, forClient: true }),
    loadSessions({ client: user._id, endsAt: { $lt: now } }, { sort: -1, limit: 20, forClient: true }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="page-title">Your calls</h1>
        <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="card text-sm text-slate-500">No calls scheduled. Your coach will set one up with you.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} now={now.getTime()} viewer="client" timeZone={timeZone} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">Times shown in {timeZone.replace(/_/g, " ")}.</p>
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Past calls</h2>
          <ul className="space-y-3">
            {past.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} now={now.getTime()} viewer="client" timeZone={timeZone} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
