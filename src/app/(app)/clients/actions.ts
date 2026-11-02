"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/session";
import { coachEmails } from "@/lib/users";
import { CLIENT_STATUSES, ClientProfile, CoachNote, User, type ClientStatus } from "@/models";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorUrl(path: string, message: string, extra = "") {
  return `${path}?${extra ? `${extra}&` : ""}error=${encodeURIComponent(message)}`;
}

/** Throws (404-style) unless `clientId` is a valid id of a user with the client role. */
async function assertClient(clientId: string) {
  if (!isValidObjectId(clientId)) throw new Error("Invalid client id");
  const exists = await User.exists({ _id: clientId, role: "client" });
  if (!exists) throw new Error("Client not found");
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
}

/**
 * Pre-registers a client by email. Login upserts users by email, so when this person
 * later signs in (Google or dev login) with the same address, they land on this account.
 */
export async function addClient(formData: FormData) {
  await requireCoach();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!EMAIL_RE.test(email)) redirect(errorUrl("/clients", "Enter a valid email address."));
  if (!name) redirect(errorUrl("/clients", "Enter the client's name."));

  const existing = await User.findOne({ email }, "role").lean();
  if (existing?.role === "coach" || coachEmails.includes(email)) redirect(errorUrl("/clients", `${email} belongs to a coach.`));
  // An existing client keeps their account (and name); we only make sure the profile exists.
  const userId = existing?._id ?? (await User.create({ email, name, role: "client" }))._id;
  await ClientProfile.updateOne({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${userId}`);
}

export async function setClientStatus(clientId: string, formData: FormData) {
  await requireCoach();
  await assertClient(clientId);
  const status = String(formData.get("status") ?? "") as ClientStatus;
  if (!CLIENT_STATUSES.includes(status)) throw new Error("Invalid status");
  await ClientProfile.updateOne({ user: clientId }, { $set: { status } }, { upsert: true });
  revalidateClient(clientId);
}

const TARGET_FIELDS = [
  { key: "calories", label: "Calories", max: 10000, integer: true },
  { key: "proteinG", label: "Protein", max: 1000, integer: false },
  { key: "carbsG", label: "Carbs", max: 2000, integer: false },
  { key: "fatG", label: "Fat", max: 1000, integer: false },
  { key: "steps", label: "Steps", max: 100000, integer: true },
  { key: "workoutsPerWeek", label: "Workouts per week", max: 14, integer: true },
] as const;

/** Saves daily/weekly targets. Empty fields clear that target. */
export async function updateTargets(clientId: string, formData: FormData) {
  await requireCoach();
  await assertClient(clientId);
  const path = `/clients/${clientId}`;
  const $set: Record<string, number> = {};
  const $unset: Record<string, ""> = {};
  for (const f of TARGET_FIELDS) {
    const raw = String(formData.get(f.key) ?? "").trim();
    if (raw === "") {
      $unset[`targets.${f.key}`] = "";
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > f.max || (f.integer && !Number.isInteger(n))) {
      const kind = f.integer ? "a whole number" : "a number";
      redirect(errorUrl(path, `${f.label} must be ${kind} between 0 and ${f.max}.`, "tab=overview"));
    }
    $set[`targets.${f.key}`] = n;
  }
  await ClientProfile.updateOne({ user: clientId }, { $set, $unset }, { upsert: true });
  revalidateClient(clientId);
  redirect(`${path}?tab=overview`);
}

export async function addNote(clientId: string, formData: FormData) {
  const coach = await requireCoach();
  await assertClient(clientId);
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(errorUrl(`/clients/${clientId}`, "A note can't be empty.", "tab=notes"));
  if (body.length > 10000) redirect(errorUrl(`/clients/${clientId}`, "Notes are limited to 10,000 characters.", "tab=notes"));
  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 10);
  await CoachNote.create({ client: clientId, author: coach._id, body, tags, pinned: formData.get("pinned") === "on" });
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=notes`);
}

export async function setNotePinned(clientId: string, noteId: string, pinned: boolean) {
  await requireCoach();
  if (!isValidObjectId(clientId) || !isValidObjectId(noteId)) throw new Error("Invalid id");
  await CoachNote.updateOne({ _id: noteId, client: clientId }, { $set: { pinned } });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteNote(clientId: string, noteId: string) {
  await requireCoach();
  if (!isValidObjectId(clientId) || !isValidObjectId(noteId)) throw new Error("Invalid id");
  await CoachNote.deleteOne({ _id: noteId, client: clientId });
  revalidatePath(`/clients/${clientId}`);
}
