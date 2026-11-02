"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { Message } from "@/models";

/**
 * Each client has one conversation with your coach, keyed by their user id.
 * Clients can only post to their own conversation; coaches can post to anyone's.
 */
export async function sendMessage(conversationId: string, formData: FormData) {
  const user = await requireUser();
  const isCoach = user.role === "coach";
  if (!isCoach && conversationId !== user.id) throw new Error("Not allowed");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await Message.create({ conversation: conversationId, sender: user._id, fromCoach: isCoach, body });
  revalidatePath("/messages", "layout");
}
