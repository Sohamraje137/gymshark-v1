import "server-only";
import type { Types } from "mongoose";
import { ActivityLog, MealLog, WorkoutLog } from "@/models";

/**
 * Most recent log day ("YYYY-MM-DD") per client across meals, workouts and activities.
 * One aggregation per collection; `$sort` + `$group/$first` uses the {client, date} index.
 */
export async function lastLogDates(clientIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (clientIds.length === 0) return result;
  const pipeline = [
    { $match: { client: { $in: clientIds } } },
    { $sort: { client: 1, date: -1 } },
    { $group: { _id: "$client", date: { $first: "$date" } } },
  ] as const;
  const groups = await Promise.all([
    MealLog.aggregate<{ _id: Types.ObjectId; date: string }>([...pipeline]),
    WorkoutLog.aggregate<{ _id: Types.ObjectId; date: string }>([...pipeline]),
    ActivityLog.aggregate<{ _id: Types.ObjectId; date: string }>([...pipeline]),
  ]);
  for (const g of groups.flat()) {
    const id = g._id.toString();
    const current = result.get(id);
    if (!current || g.date > current) result.set(id, g.date);
  }
  return result;
}

/** "Tue, Nov 3, 6:00 PM" in the server's time zone (the coach has no time zone setting yet). */
export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
