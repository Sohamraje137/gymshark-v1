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
