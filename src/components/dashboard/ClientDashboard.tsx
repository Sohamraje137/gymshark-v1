import type { CurrentUser } from "@/lib/session";

/** Client home page: today's log, this week's check-in, next call. */
export async function ClientDashboard({ user }: { user: CurrentUser }) {
  return <h1 className="page-title">Hi {user.name?.split(" ")[0] ?? "there"} 👋</h1>;
}
