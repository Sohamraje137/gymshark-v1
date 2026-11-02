import "server-only";
import type { Model, QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { CoachingSession } from "@/models";
import type { SessionStatus, SessionType, SessionView } from "./constants";

type Filter = QueryFilter<typeof CoachingSession extends Model<infer Raw> ? Raw : never>;

/**
 * Loads sessions as plain `SessionView`s with client/coach names.
 * `forClient` drops the coach's private outcome notes at the query level.
 */
export async function loadSessions(
  filter: Filter,
  { sort, limit, forClient = false }: { sort: 1 | -1; limit: number; forClient?: boolean },
): Promise<SessionView[]> {
  await connectDB();
  const docs = await CoachingSession.find(filter)
    .select(forClient ? "-outcome -googleEventId" : "")
    .sort({ startsAt: sort })
    .limit(limit)
    .populate<{ client: { _id: unknown; name?: string; email?: string } | null }>("client", "name email")
    .populate<{ coach: { _id: unknown; name?: string } | null }>("coach", "name")
    .lean();

  return docs.map((d) => ({
    id: d._id.toString(),
    clientId: String(d.client?._id ?? ""),
    clientName: d.client?.name || d.client?.email || "Unknown client",
    coachName: d.coach?.name || undefined,
    type: d.type as SessionType,
    title: d.title,
    startsAt: d.startsAt.toISOString(),
    endsAt: d.endsAt.toISOString(),
    status: (d.status ?? "scheduled") as SessionStatus,
    agenda: d.agenda || undefined,
    outcome: forClient ? undefined : d.outcome || undefined,
    meetUrl: d.meetUrl || undefined,
  }));
}
