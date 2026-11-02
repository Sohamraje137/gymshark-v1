// Hevy public API client + workout sync. See docs/integrations.md.
// API docs: https://api.hevyapp.com/docs (Hevy Pro only; key from https://hevy.com/settings?developer).
import { connectDB } from "@/lib/db";
import { todayIn } from "@/lib/dates";
import { ClientProfile, WorkoutLog } from "@/models";

export const HEVY_API_BASE = "https://api.hevyapp.com";
const PAGE_SIZE = 10; // API maximum
const FIRST_SYNC_DAYS = 90;
const SAFETY_MARGIN_MS = 2 * 24 * 60 * 60 * 1000; // re-read 2 days before the last sync to catch late edits
const MAX_PAGES = 100; // hard stop: 1000 workouts per sync

// ---------- Documented shapes (Workout schema in the OpenAPI spec) ----------

export type HevySet = {
  index: number;
  type: "normal" | "warmup" | "dropset" | "failure" | string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric?: number | null;
};

export type HevyExercise = {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: number | null;
  sets: HevySet[];
};

export type HevyWorkout = {
  id: string;
  title: string;
  routine_id?: string | null;
  description: string | null;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  updated_at: string;
  created_at: string;
  exercises: HevyExercise[];
};

export type HevyWorkoutsPage = { page: number; page_count: number; workouts: HevyWorkout[] };

export type HevyWorkoutEvent =
  | { type: "updated"; workout: HevyWorkout }
  | { type: "deleted"; id: string; deleted_at?: string };

export type HevyWorkoutEventsPage = { page: number; page_count: number; events: HevyWorkoutEvent[] };

// ---------- HTTP ----------

export class HevyApiError extends Error {
  constructor(
    message: string,
    readonly kind: "invalid_key" | "rate_limited" | "http",
    readonly status?: number,
  ) {
    super(message);
    this.name = "HevyApiError";
  }
}

async function hevyGet<T>(apiKey: string, path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(path, HEVY_API_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { "api-key": apiKey, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) return (await res.json()) as T;

  // Error bodies are plain text (a bad key is 401 "InvalidApiKey" as text/html), never JSON.
  if (res.status === 401) {
    throw new HevyApiError("Hevy rejected the API key. Check it at hevy.com/settings?developer (requires Hevy Pro).", "invalid_key", 401);
  }
  if (res.status === 429) {
    const retry = res.headers.get("retry-after");
    throw new HevyApiError(
      `Hevy rate limit reached. Try again ${retry ? `in ${retry} seconds` : "in a minute"}.`,
      "rate_limited",
      429,
    );
  }
  const body = (await res.text().catch(() => "")).slice(0, 200);
  throw new HevyApiError(`Hevy API error ${res.status}${body ? `: ${body}` : ""}`, "http", res.status);
}

/** Workouts, newest first (observed by third parties; the spec does not state the order). */
export function listHevyWorkouts(apiKey: string, page = 1, pageSize = PAGE_SIZE) {
  return hevyGet<HevyWorkoutsPage>(apiKey, "/v1/workouts", { page, pageSize });
}

/** Updated/deleted workout events since an instant, newest first. Always pass `since` explicitly. */
export function listHevyWorkoutEvents(apiKey: string, since: Date, page = 1, pageSize = PAGE_SIZE) {
  return hevyGet<HevyWorkoutEventsPage>(apiKey, "/v1/workouts/events", { page, pageSize, since: since.toISOString() });
}

// ---------- Mapping (pure) ----------

const SET_TYPES = new Set(["normal", "warmup", "dropset", "failure"]);
const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Maps one Hevy workout to WorkoutLog fields. Hevy already uses kg, metres and seconds. */
export function mapHevyWorkout(w: HevyWorkout, timeZone: string) {
  const start = new Date(w.start_time);
  const end = new Date(w.end_time);
  const durationMs = end.getTime() - start.getTime();
  return {
    date: todayIn(timeZone, start), // local calendar day the workout started
    title: (w.title?.trim() || "Hevy workout").slice(0, 200),
    durationMin: Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs / 60_000) : undefined,
    notes: w.description?.trim() ? w.description.trim().slice(0, 2000) : undefined,
    exercises: [...(w.exercises ?? [])]
      .sort((a, b) => a.index - b.index)
      .map((e) => ({
        name: e.title || "Exercise",
        notes: e.notes?.trim() || undefined,
        sets: [...(e.sets ?? [])]
          .sort((a, b) => a.index - b.index)
          .map((s) => ({
            type: SET_TYPES.has(s.type) && s.type !== "normal" ? (s.type as "warmup" | "dropset" | "failure") : undefined,
            reps: num(s.reps),
            weightKg: num(s.weight_kg),
            durationSec: num(s.duration_seconds),
            distanceM: num(s.distance_meters),
            rpe: num(s.rpe),
          })),
      })),
    source: "hevy" as const,
    externalId: w.id,
  };
}

// ---------- Sync ----------

export type HevySyncResult = { fetched: number; created: number; existing: number; since: string };

/**
 * Pulls recent Hevy workouts for one client and upserts them as WorkoutLogs.
 * Reads pages (newest first) until a whole page starts before `hevyLastSyncAt - 2 days`
 * (90 days back on the first sync). Throws HevyApiError for a bad key, rate limit, or API error.
 */
export async function syncHevyWorkouts(clientId: string): Promise<HevySyncResult> {
  await connectDB();
  const profile = await ClientProfile.findOne({ user: clientId }).select("+integrations.hevyApiKey").lean();
  const apiKey = profile?.integrations?.hevyApiKey;
  if (!profile || !apiKey) throw new HevyApiError("No Hevy API key saved.", "invalid_key");

  const startedAt = new Date();
  const timeZone = profile.timeZone || "UTC";
  const last = profile.integrations?.hevyLastSyncAt;
  const cutoff = last
    ? new Date(last.getTime() - SAFETY_MARGIN_MS)
    : new Date(startedAt.getTime() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);

  const result: HevySyncResult = { fetched: 0, created: 0, existing: 0, since: cutoff.toISOString() };

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await listHevyWorkouts(apiKey, page);
    const recent = data.workouts.filter((w) => new Date(w.start_time) >= cutoff);
    if (recent.length > 0) {
      const write = await WorkoutLog.bulkWrite(
        recent.map((w) => {
          const doc = mapHevyWorkout(w, timeZone);
          return {
            updateOne: {
              filter: { client: profile.user, source: "hevy", externalId: doc.externalId },
              update: { $set: { ...doc, client: profile.user } },
              upsert: true,
            },
          };
        }),
        { ordered: false },
      );
      result.fetched += recent.length;
      result.created += write.upsertedCount;
      result.existing += write.matchedCount;
    }
    // The list is newest first by creation, not strictly by start_time (a backdated workout can sit among new
    // ones), so stop only at a page with nothing inside the window. Costs one extra request per sync.
    if (recent.length === 0 || page >= data.page_count) break;
  }

  await ClientProfile.updateOne({ _id: profile._id }, { $set: { "integrations.hevyLastSyncAt": startedAt } });
  return result;
}
