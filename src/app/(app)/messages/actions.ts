"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { Message } from "@/models";

/**
 * Each regular user has one conversation with the admin team, keyed by their user id.
 * Users can only post to their own conversation; admins can post to anyone's.
 */
export async function sendMessage(conversationId: string, formData: FormData) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  if (!isAdmin && conversationId !== user.id) throw new Error("Not allowed");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await Message.create({ conversation: conversationId, sender: user._id, fromAdmin: isAdmin, body });
  revalidatePath("/messages", "layout");
}
