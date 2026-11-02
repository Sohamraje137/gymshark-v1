import "server-only";
import { auth as googleAuth, calendar } from "@googleapis/calendar";
import { connectDB } from "@/lib/db";
import { User } from "@/models";

/** Calendar client authorised as the given user, or null if they never granted access. */
async function calendarFor(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select("+googleRefreshToken").lean();
  if (!user?.googleRefreshToken) return null;

  const oauth = new googleAuth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  // The library exchanges the refresh token for short-lived access tokens automatically.
  oauth.setCredentials({ refresh_token: user.googleRefreshToken });
  return calendar({ version: "v3", auth: oauth });
}

export async function listUpcomingEvents(userId: string, maxResults = 10) {
  const cal = await calendarFor(userId);
  if (!cal) return null;
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });
  return { timeZone: res.data.timeZone ?? "UTC", events: res.data.items ?? [] };
}

export async function createEvent(
  userId: string,
  input: { summary: string; description?: string; start: string; end: string; timeZone: string },
) {
  const cal = await calendarFor(userId);
  if (!cal) throw new Error("Google Calendar is not connected");
  const res = await cal.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      // "2026-11-01T10:00" + an IANA zone like "America/New_York"
      start: { dateTime: `${input.start}:00`, timeZone: input.timeZone },
      end: { dateTime: `${input.end}:00`, timeZone: input.timeZone },
    },
  });
  return res.data;
}

/** Whether the user has a stored Google refresh token (dev-login users don't). Never returns the token. */
export async function hasCalendarAccess(userId: string): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId).select("+googleRefreshToken").lean();
  return Boolean(user?.googleRefreshToken);
}

export type MeetingEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  /** IANA zone the event is shown in, e.g. the coach's browser zone. */
  timeZone: string;
  attendeeEmail: string;
  /** Ask Google to attach a new Google Meet conference. */
  createMeet: boolean;
  /** Unique per event; Google de-duplicates conference creation by this id. */
  requestId: string;
};

/**
 * Creates an event in the user's primary calendar, invites the attendee (Google emails them) and,
 * if asked, attaches an auto-generated Google Meet link.
 * Returns null if the user hasn't connected Google Calendar. Throws on Google API errors.
 */
export async function createMeetingEvent(
  userId: string,
  input: MeetingEventInput,
): Promise<{ eventId: string; meetUrl: string | null } | null> {
  const cal = await calendarFor(userId);
  if (!cal) return null;
  const res = await cal.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
      end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
      attendees: [{ email: input.attendeeEmail }],
      conferenceData: input.createMeet
        ? { createRequest: { requestId: input.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } }
        : undefined,
    },
  });
  let event = res.data;
  if (!event.id) throw new Error("Google Calendar returned an event without an id");
  // Conference creation is usually synchronous, but Google may report it as pending. Re-read once.
  if (input.createMeet && !event.hangoutLink && event.conferenceData?.createRequest?.status?.statusCode === "pending") {
    event = (await cal.events.get({ calendarId: "primary", eventId: event.id })).data;
  }
  const videoEntry = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
  return { eventId: event.id!, meetUrl: event.hangoutLink ?? videoEntry ?? null };
}

/**
 * Changes the time and/or title of an event created by `createMeetingEvent`; attendees are notified.
 * Returns false if the user hasn't connected Google Calendar. Throws on Google API errors.
 */
export async function updateMeetingEvent(
  userId: string,
  eventId: string,
  input: { summary?: string; start?: Date; end?: Date; timeZone?: string },
): Promise<boolean> {
  const cal = await calendarFor(userId);
  if (!cal) return false;
  await cal.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    conferenceDataVersion: 1, // keeps the existing Meet conference (patch leaves omitted fields alone)
    requestBody: {
      summary: input.summary,
      start: input.start ? { dateTime: input.start.toISOString(), timeZone: input.timeZone } : undefined,
      end: input.end ? { dateTime: input.end.toISOString(), timeZone: input.timeZone } : undefined,
    },
  });
  return true;
}

/**
 * Deletes (cancels) the event; attendees get a cancellation email. An event that is already gone counts as done.
 * Returns false if the user hasn't connected Google Calendar. Throws on other Google API errors.
 */
export async function cancelMeetingEvent(userId: string, eventId: string): Promise<boolean> {
  const cal = await calendarFor(userId);
  if (!cal) return false;
  try {
    await cal.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 410) return true;
    throw err;
  }
  return true;
}
