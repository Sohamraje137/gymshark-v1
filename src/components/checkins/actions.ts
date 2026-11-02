"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/session";
import { CheckIn } from "@/models";

/** Coach saves feedback on a client's check-in and marks it reviewed. */
export async function reviewCheckIn(formData: FormData) {
  await requireCoach();
  const checkInId = String(formData.get("checkInId") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!isValidObjectId(checkInId)) throw new Error("Invalid check-in.");
  if (feedback.length > 5000) throw new Error("Feedback must be at most 5000 characters.");

  const checkIn = await CheckIn.findByIdAndUpdate(
    checkInId,
    feedback
      ? { $set: { coachFeedback: feedback, reviewedAt: new Date() } }
      : { $set: { reviewedAt: new Date() }, $unset: { coachFeedback: 1 } },
    { projection: { client: 1 } },
  );
  if (!checkIn) throw new Error("Check-in not found.");

  revalidatePath("/clients/" + checkIn.client.toString());
  revalidatePath("/check-ins");
  revalidatePath("/dashboard");
}
