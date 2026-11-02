// Shared by the scheduling pages, server actions and session components (server and client).

export const SESSION_TYPE_LABELS = {
  onboarding: "Onboarding call",
  weekly_checkin: "Weekly check-in",
  monthly_review: "Monthly review",
  catch_up: "Catch-up",
} as const;

export type SessionType = keyof typeof SESSION_TYPE_LABELS;
export type SessionStatus = "scheduled" | "completed" | "cancelled";

export const SESSION_TYPE_BADGE: Record<SessionType, string> = {
  onboarding: "bg-amber-100 text-amber-800",
  weekly_checkin: "bg-indigo-100 text-indigo-700",
  monthly_review: "bg-emerald-100 text-emerald-700",
  catch_up: "bg-slate-100 text-slate-700",
};

export const SESSION_STATUS_BADGE: Record<SessionStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

/** Allowed call lengths in minutes. */
export const DURATIONS = [15, 30, 45, 60, 90] as const;
export const MAX_REPEAT_WEEKS = 12;

/** A session as passed to (client) components: plain strings only. */
export type SessionView = {
  id: string;
  clientId: string;
  clientName: string;
  coachName?: string;
  type: SessionType;
  title: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  status: SessionStatus;
  agenda?: string;
  outcome?: string; // coach-only; never set for client views
  meetUrl?: string;
};
