"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/session";
import { User } from "@/models";

export async function setRole(userId: string, role: "client" | "coach") {
  const coach = await requireCoach();
  if (userId === coach.id) throw new Error("You can't change your own role.");
  await User.findByIdAndUpdate(userId, { role });
  revalidatePath("/access");
}

export async function setBlocked(userId: string, blocked: boolean) {
  const coach = await requireCoach();
  if (userId === coach.id) throw new Error("You can't block yourself.");
  await User.findByIdAndUpdate(userId, { blocked });
  revalidatePath("/access");
}
