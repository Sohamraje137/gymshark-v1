"use server";

import { revalidatePath } from "next/cache";
import { DURATIONS, MAX_REPEAT_WEEKS, SESSION_TYPE_LABELS, type SessionType } from "@/components/sessions/constants";
import { addDays, isValidTimeZone, zonedTimeToUtc } from "@/lib/dates";
import { cancelMeetingEvent, createMeetingEvent, updateMeetingEvent } from "@/lib/google-calendar";
import { requireCoach } from "@/lib/session";
import { ClientProfile, CoachingSession, SESSION_TYPES, User } from "@/models";

/** Result of the "Schedule a call" form. On error, `values` echoes the input so nothing is lost. */
export type ScheduleState = { ok?: string; error?: string; warnings?: string[]; values?: Record<string, string> } | null;
/** Result of a per-session action (complete / cancel / reschedule). */
export type SessionActionState = { ok?: string; error?: string; warning?: string } | null;

const objectId = /^[a-f0-9]{24}$/i;
const localDateTime = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/; // value of <input type="datetime-local">
const FORM_FIELDS = ["clientId", "type", "title", "start", "duration", "agenda", "createMeet", "meetUrl", "repeat"];

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

function revalidateSessionPages(clientId: string) {
  revalidatePath("/schedule");
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
}

/** Logs the Google error (message only) and returns a user-facing warning. */
function googleWarning(what: string, err: unknown) {
  console.error(`Google Calendar error (${what}):`, err instanceof Error ? err.message : err);
  return `Saved, but Google Calendar failed to ${what}. Reconnect Google on the Calendar page and check the event there.`;
}

function parseHttpsUrl(value: string): string | null {
  if (value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function scheduleCall(_prev: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const coach = await requireCoach();
  const values = Object.fromEntries(FORM_FIELDS.map((k) => [k, str(formData.get(k))]));
  const fail = (error: string): ScheduleState => ({ error, values });

  const { clientId, type, agenda } = values;
  const timeZone = str(formData.get("timeZone"));
  const startMatch = localDateTime.exec(values.start);
  const duration = Number(values.duration);
  const repeat = Number(values.repeat || "1");

  if (!objectId.test(clientId)) return fail("Please choose a client.");
  if (!(SESSION_TYPES as readonly string[]).includes(type)) return fail("Please choose a call type.");
  if (!startMatch) return fail("Please choose a start date and time.");
  if (!isValidTimeZone(timeZone)) return fail("Couldn't detect your time zone. Reload the page and try again.");
  if (!(DURATIONS as readonly number[]).includes(duration)) return fail("Please choose a duration.");
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > MAX_REPEAT_WEEKS) {
    return fail(`Repeat must be between 1 and ${MAX_REPEAT_WEEKS} weeks.`);
  }
  if (values.title.length > 200) return fail("Title is too long (max 200 characters).");
  if (agenda.length > 5000) return fail("Agenda is too long (max 5000 characters).");
  let meetUrl: string | undefined;
  if (values.meetUrl) {
    meetUrl = parseHttpsUrl(values.meetUrl) ?? undefined;
    if (!meetUrl) return fail("The meeting link must be a valid https:// URL.");
  }

  const client = await User.findOne({ _id: clientId, role: "client" }, "name email").lean();
  if (!client) return fail("That client doesn't exist.");
  const profile = await ClientProfile.findOne({ user: clientId }, "status").lean();
  if (profile?.status === "archived") return fail("That client is archived.");

  const [, day, time] = startMatch;
  const firstStart = zonedTimeToUtc(values.start, timeZone);
  if (firstStart.getTime() < Date.now()) return fail("The start time is in the past.");

  const title = values.title || `${SESSION_TYPE_LABELS[type as SessionType]}: ${client.name || client.email}`;
  // A pasted link wins over an auto-generated Meet link.
  const createMeet = values.createMeet === "on" && !meetUrl;

  // Same wall-clock time every week, even across a DST change.
  const sessions = await CoachingSession.insertMany(
    Array.from({ length: repeat }, (_, i) => {
      const startsAt = zonedTimeToUtc(`${addDays(day, 7 * i)}T${time}`, timeZone);
      return {
        client: clientId,
        coach: coach._id,
        type,
        title,
        startsAt,
        endsAt: new Date(startsAt.getTime() + duration * 60_000),
        status: "scheduled",
        agenda: agenda || undefined,
        meetUrl,
      };
    }),
  );

  // The sessions are saved; Google problems only produce warnings from here on.
  const warnings: string[] = [];
  let connected = true;
  for (const s of sessions) {
    try {
      const event = await createMeetingEvent(coach.id, {
        summary: title,
        description: agenda || undefined,
        location: meetUrl,
        start: s.startsAt,
        end: s.endsAt,
        timeZone,
        attendeeEmail: client.email,
        createMeet,
        requestId: `session-${s._id.toString()}`,
      });
      if (!event) {
        connected = false;
        break;
      }
      const update: { googleEventId: string; meetUrl?: string } = { googleEventId: event.eventId };
      if (!meetUrl && event.meetUrl) update.meetUrl = event.meetUrl;
      await CoachingSession.updateOne({ _id: s._id }, update);
      if (createMeet && !event.meetUrl) warnings.push("Google created the event but no Meet link yet. Check Google Calendar.");
    } catch (err) {
      warnings.push(googleWarning("create the calendar event", err));
      break; // Usually the same failure for every event; don't hammer the API.
    }
  }
  if (!connected && !meetUrl) warnings.push("No meeting link: connect Google Calendar to auto-create Meet links, or paste a link.");

  revalidateSessionPages(clientId);
  return { ok: repeat === 1 ? "Call scheduled." : `${repeat} weekly calls scheduled.`, warnings: [...new Set(warnings)] };
}

/** Loads a session by id from a form/bound argument; null if the id is malformed or unknown. */
async function findSession(sessionId: string) {
  if (!objectId.test(sessionId)) return null;
  return CoachingSession.findById(sessionId);
}

export async function completeSession(
  sessionId: string,
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  await requireCoach();
  const outcome = str(formData.get("outcome"));
  if (outcome.length > 5000) return { error: "Outcome is too long (max 5000 characters)." };
  const session = await findSession(sessionId);
  if (!session) return { error: "Call not found." };
  if (session.status === "cancelled") return { error: "This call was cancelled." };

  session.status = "completed";
  session.outcome = outcome || undefined;
  await session.save();
  revalidateSessionPages(session.client.toString());
  return { ok: "Marked as completed." };
}

export async function cancelSession(sessionId: string, _prev: SessionActionState): Promise<SessionActionState> {
  await requireCoach();
  const session = await findSession(sessionId);
  if (!session) return { error: "Call not found." };
  if (session.status !== "scheduled") return { error: "Only scheduled calls can be cancelled." };

  session.status = "cancelled";
  await session.save();

  let warning: string | undefined;
  if (session.googleEventId) {
    try {
      // The event lives in the calendar of the coach who scheduled it.
      const done = await cancelMeetingEvent(session.coach.toString(), session.googleEventId);
      if (!done) warning = "Cancelled here, but Google Calendar isn't connected. Delete the calendar event manually.";
    } catch (err) {
      warning = googleWarning("cancel the calendar event", err);
    }
  }
  revalidateSessionPages(session.client.toString());
  return { ok: "Call cancelled.", warning };
}

export async function rescheduleSession(
  sessionId: string,
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  await requireCoach();
  const start = str(formData.get("start"));
  const timeZone = str(formData.get("timeZone"));
  const duration = Number(str(formData.get("duration")));
  if (!localDateTime.test(start)) return { error: "Please choose a new date and time." };
  if (!isValidTimeZone(timeZone)) return { error: "Couldn't detect your time zone. Reload and try again." };
  if (!(DURATIONS as readonly number[]).includes(duration)) return { error: "Please choose a duration." };

  const session = await findSession(sessionId);
  if (!session) return { error: "Call not found." };
  if (session.status !== "scheduled") return { error: "Only scheduled calls can be rescheduled." };

  const startsAt = zonedTimeToUtc(start, timeZone);
  if (startsAt.getTime() < Date.now()) return { error: "The new time is in the past." };
  session.startsAt = startsAt;
  session.endsAt = new Date(startsAt.getTime() + duration * 60_000);
  await session.save();

  let warning: string | undefined;
  if (session.googleEventId) {
    try {
      const done = await updateMeetingEvent(session.coach.toString(), session.googleEventId, {
        start: session.startsAt,
        end: session.endsAt,
        timeZone,
      });
      if (!done) warning = "Rescheduled here, but Google Calendar isn't connected. Update the calendar event manually.";
    } catch (err) {
      warning = googleWarning("update the calendar event", err);
    }
  }
  revalidateSessionPages(session.client.toString());
  return { ok: "Call rescheduled.", warning };
}
