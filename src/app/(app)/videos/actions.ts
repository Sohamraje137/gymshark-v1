"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { toEmbedUrl } from "@/lib/video";
import { Video } from "@/models";

export async function addVideo(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const embedUrl = toEmbedUrl(url);
  if (!title || !embedUrl) throw new Error("Please enter a title and a valid YouTube or Vimeo link.");
  await Video.create({ title, url, embedUrl, addedBy: admin._id });
  revalidatePath("/videos");
}

export async function deleteVideo(id: string) {
  await requireAdmin();
  await Video.findByIdAndDelete(id);
  revalidatePath("/videos");
}
