import Link from "next/link";
import { EventList } from "@/components/EventList";
import { listUpcomingEvents } from "@/lib/google-calendar";
import { requireUser } from "@/lib/session";
import { Announcement } from "@/models";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [announcements, calendar] = await Promise.all([
    Announcement.find().sort({ createdAt: -1 }).limit(3).lean(),
    listUpcomingEvents(user.id, 5).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Hi {user.name?.split(" ")[0] ?? "there"} 👋</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest announcements</h2>
            <Link href="/announcements" className="text-sm text-indigo-600 hover:underline">
              All
            </Link>
          </div>
          {announcements.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a._id.toString()}>
                <p className="font-medium">{a.title}</p>
                <p className="line-clamp-2 text-sm text-slate-600">{a.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Upcoming events</h2>
            <Link href="/calendar" className="text-sm text-indigo-600 hover:underline">
              Calendar
            </Link>
          </div>
          {calendar ? (
            <EventList events={calendar.events} timeZone={calendar.timeZone} />
          ) : (
            <p className="text-sm text-slate-500">
              Google Calendar isn&apos;t connected. <Link href="/calendar" className="text-indigo-600 hover:underline">Connect it</Link>.
            </p>
          )}
        </section>
      </div>
      <Link href="/messages" className="card block hover:border-indigo-300">
        <h2 className="font-semibold">Messages</h2>
        <p className="text-sm text-slate-600">
          {user.role === "admin" ? "Read and reply to messages from users." : "Send a message to the admin team."}
        </p>
      </Link>
    </div>
  );
}
