"use server";

import { revalidatePath } from "next/cache";
import { createEvent } from "@/lib/google-calendar";
import { requireUser } from "@/lib/session";

const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // value of <input type="datetime-local">

export async function addCalendarEvent(formData: FormData) {
  const user = await requireUser();
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const timeZone = String(formData.get("timeZone") || "UTC");

  if (!summary || !localDateTime.test(start) || !localDateTime.test(end) || end <= start) {
    throw new Error("Please provide a title and a valid start/end time (end after start).");
  }
  await createEvent(user.id, { summary, description, start, end, timeZone });
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}
