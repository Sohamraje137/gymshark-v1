import Link from "next/link";
import { mondayOf, todayIn } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";
import { fmt, sumOf } from "@/components/logs/format";
import { Announcement, ActivityLog, CheckIn, ClientProfile, CoachingSession, MealLog, WorkoutLog } from "@/models";

/** Client home page: today's log vs targets, this week's check-in, next call, latest announcement. */
export async function ClientDashboard({ user }: { user: CurrentUser }) {
  const profile = await ClientProfile.findOne({ user: user._id }, "timeZone targets").lean();
  const timeZone = profile?.timeZone ?? "UTC";
  const today = todayIn(timeZone);
  const weekOf = mondayOf(today);
  const targets = profile?.targets ?? {};

  const [meals, workouts, steps, checkIn, nextCall, announcement] = await Promise.all([
    MealLog.find({ client: user._id, date: today }, "calories proteinG").lean(),
    WorkoutLog.countDocuments({ client: user._id, date: { $gte: weekOf, $lte: today } }),
    ActivityLog.find({ client: user._id, date: today, type: "steps" }, "value").lean(),
    CheckIn.findOne({ client: user._id, weekOf }, "reviewedAt coachFeedback").lean(),
    CoachingSession.findOne({ client: user._id, status: "scheduled", endsAt: { $gte: new Date() } })
      .sort({ startsAt: 1 })
      .select("title startsAt meetUrl")
      .lean(),
    Announcement.findOne().sort({ createdAt: -1 }).select("title body createdAt").lean(),
  ]);

  const rows = [
    { label: "Calories", value: sumOf(meals, (m) => m.calories), target: targets.calories, unit: "kcal" },
    { label: "Protein", value: sumOf(meals, (m) => m.proteinG), target: targets.proteinG, unit: "g" },
    { label: "Steps", value: sumOf(steps, (s) => s.value), target: targets.steps, unit: "" },
    { label: "Workouts this week", value: workouts, target: targets.workoutsPerWeek, unit: "" },
  ];
  const callTime = nextCall
    ? new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(nextCall.startsAt)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Hi {user.name?.split(" ")[0] ?? "there"} 👋</h1>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Today</h2>
          <Link href="/log" className="btn-secondary">
            Log food or training
          </Link>
        </div>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-medium">
                  {fmt(r.value)}
                  {r.target ? ` / ${fmt(r.target)}` : ""} {r.unit}
                </span>
              </div>
              {r.target ? (
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (r.value / r.target) * 100)}%` }} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/check-ins" className="card block hover:border-indigo-300">
          <h2 className="font-semibold">Weekly check-in</h2>
          <p className="mt-1 text-sm text-slate-600">
            {!checkIn
              ? "Not submitted yet for this week."
              : checkIn.reviewedAt
                ? "Your coach replied. Tap to read the feedback."
                : "Submitted. Waiting for your coach."}
          </p>
          {!checkIn && <span className="mt-3 inline-block text-sm font-medium text-indigo-600">Fill it in →</span>}
        </Link>

        <section className="card">
          <h2 className="font-semibold">Next call</h2>
          {nextCall ? (
            <>
              <p className="mt-1 text-sm text-slate-700">{nextCall.title}</p>
              <p className="text-sm text-slate-500">{callTime}</p>
              {nextCall.meetUrl && (
                <a href={nextCall.meetUrl} target="_blank" rel="noreferrer" className="btn mt-3">
                  Join call
                </a>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No call scheduled.</p>
          )}
        </section>
      </div>

      {announcement && (
        <Link href="/announcements" className="card block hover:border-indigo-300">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Latest from your coach</p>
          <h2 className="mt-1 font-semibold">{announcement.title}</h2>
          <p className="line-clamp-2 text-sm text-slate-600">{announcement.body}</p>
        </Link>
      )}
    </div>
  );
}
