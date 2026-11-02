"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { User } from "@/models";

export async function setRole(userId: string, role: "user" | "admin") {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You can't change your own role.");
  await User.findByIdAndUpdate(userId, { role });
  revalidatePath("/admin");
}

export async function setBlocked(userId: string, blocked: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You can't block yourself.");
  await User.findByIdAndUpdate(userId, { blocked });
  revalidatePath("/admin");
}
