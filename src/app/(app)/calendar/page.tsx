import { signIn } from "@/auth";
import { EventList } from "@/components/EventList";
import { TimeZoneInput } from "@/components/TimeZoneInput";
import { listUpcomingEvents } from "@/lib/google-calendar";
import { requireUser } from "@/lib/session";
import { addCalendarEvent } from "./actions";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const user = await requireUser();

  let data: Awaited<ReturnType<typeof listUpcomingEvents>> = null;
  let failed = false;
  try {
    data = await listUpcomingEvents(user.id, 20);
  } catch (err) {
    // Usually: the user unticked the Calendar permission, or revoked access in their Google account.
    console.error("Google Calendar error:", err instanceof Error ? err.message : err);
    failed = true;
  }

  if (!data) {
    return (
      <div>
        <h1 className="page-title">Calendar</h1>
        <div className="card space-y-3">
          <p className="text-slate-700">
            {failed
              ? "We couldn't reach your Google Calendar. Please reconnect and make sure the Calendar permission is ticked."
              : "Connect your Google Calendar to see and add events."}
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/calendar" });
            }}
          >
            <button className="btn">Connect Google Calendar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section>
        <h1 className="page-title">Upcoming events</h1>
        <div className="card">
          <EventList events={data.events} timeZone={data.timeZone} />
        </div>
      </section>
      <section>
        <h2 className="mb-6 text-lg font-semibold md:mt-1">Add event</h2>
        <form action={addCalendarEvent} className="card space-y-3">
          <input name="summary" placeholder="Title" required className="input" />
          <textarea name="description" placeholder="Description (optional)" rows={2} className="input" />
          <label className="block text-xs font-medium text-slate-600">
            Starts
            <input type="datetime-local" name="start" required className="input mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Ends
            <input type="datetime-local" name="end" required className="input mt-1" />
          </label>
          <TimeZoneInput />
          <button className="btn w-full">Add to Google Calendar</button>
        </form>
      </section>
    </div>
  );
}
