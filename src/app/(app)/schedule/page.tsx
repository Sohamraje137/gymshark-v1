import { loadSessions } from "@/components/sessions/data";
import { DayGroups } from "@/components/sessions/DayGroups";
import { ScheduleForm } from "@/components/sessions/ScheduleForm";
import { SessionCard } from "@/components/sessions/SessionCard";
import type { SessionView } from "@/components/sessions/constants";
import { hasCalendarAccess } from "@/lib/google-calendar";
import { requireCoach } from "@/lib/session";
import { ClientProfile } from "@/models";

export const metadata = { title: "Schedule" };

const DAY = 864e5;

export default async function SchedulePage() {
  const coach = await requireCoach();
  const now = new Date();
  const nowMs = now.getTime();

  const [upcoming, past, profiles, googleConnected] = await Promise.all([
    // Includes calls in progress (not yet ended).
    loadSessions({ endsAt: { $gte: now }, startsAt: { $lte: new Date(nowMs + 30 * DAY) } }, { sort: 1, limit: 300 }),
    loadSessions({ endsAt: { $lt: now }, startsAt: { $gte: new Date(nowMs - 14 * DAY) } }, { sort: -1, limit: 300 }),
    ClientProfile.find({ status: { $in: ["active", "onboarding"] } }, "user")
      .populate<{ user: { _id: unknown; name?: string; email: string } | null }>("user", "name email")
      .lean(),
    hasCalendarAccess(coach.id),
  ]);

  const clients = profiles
    .flatMap((p) => (p.user ? [{ id: String(p.user._id), name: p.user.name || p.user.email }] : []))
    .sort((a, b) => a.name.localeCompare(b.name));

  const toItems = (list: SessionView[]) =>
    list.map((s) => ({
      key: s.id,
      at: s.startsAt,
      node: <SessionCard session={s} now={nowMs} viewer="coach" showClient />,
    }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-8">
        <section>
          <h1 className="page-title">Schedule</h1>
          <h2 className="mb-3 text-lg font-semibold">Next 30 days</h2>
          <DayGroups items={toItems(upcoming)} nowIso={now.toISOString()} empty="No calls in the next 30 days." />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Last 14 days</h2>
          <DayGroups items={toItems(past)} nowIso={now.toISOString()} empty="No calls in the last 14 days." />
        </section>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold lg:mt-1 lg:mb-6">Schedule a call</h2>
        <ScheduleForm clients={clients} googleConnected={googleConnected} />
      </section>
    </div>
  );
}
