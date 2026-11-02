"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { Announcement } from "@/models";

export async function createAnnouncement(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;
  await Announcement.create({ title, body, author: admin._id });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await Announcement.findByIdAndDelete(id);
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
