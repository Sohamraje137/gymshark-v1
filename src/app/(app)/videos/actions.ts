"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/session";
import { toEmbedUrl } from "@/lib/video";
import { Video } from "@/models";

export async function addVideo(formData: FormData) {
  const coach = await requireCoach();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const embedUrl = toEmbedUrl(url);
  if (!title || !embedUrl) throw new Error("Please enter a title and a valid YouTube or Vimeo link.");
  await Video.create({ title, url, embedUrl, addedBy: coach._id });
  revalidatePath("/videos");
}

export async function deleteVideo(id: string) {
  await requireCoach();
  await Video.findByIdAndDelete(id);
  revalidatePath("/videos");
}
