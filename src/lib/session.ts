import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models";

/**
 * Returns the signed-in user from the database, or null.
 * The JWT identifies the user; role/blocked are re-read from MongoDB so that
 * role changes and blocking take effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user || user.blocked) return null;
  return { ...user, id: user._id.toString() };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireCoach() {
  const user = await requireUser();
  if (user.role !== "coach") redirect("/dashboard");
  return user;
}

export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "client") redirect("/dashboard");
  return user;
}

/**
 * Who may see/edit data belonging to `clientId`: the client themself or any coach.
 * Use in every page/action that takes a client id from the URL or a form.
 */
export async function requireClientAccess(clientId: string) {
  const user = await requireUser();
  if (user.role !== "coach" && user.id !== clientId) redirect("/dashboard");
  return user;
}
