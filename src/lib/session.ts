import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models";

/**
 * Returns the signed-in user from the database, or null.
 * The JWT identifies the user; the role/blocked flags are re-read from MongoDB so that
 * promoting, demoting or blocking someone takes effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user || user.blocked) return null;
  return { ...user, id: user._id.toString() };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
