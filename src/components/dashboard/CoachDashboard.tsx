import type { CurrentUser } from "@/lib/session";

/** Coach home page: today's calls, clients needing attention. Owned by the coach-workspace feature. */
export async function CoachDashboard({ user }: { user: CurrentUser }) {
  return <h1 className="page-title">Hi {user.name?.split(" ")[0] ?? "coach"} 👋</h1>;
}
