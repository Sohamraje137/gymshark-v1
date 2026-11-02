"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/session";
import { ClientProfile } from "@/models";
import { HevyApiError, syncHevyWorkouts } from "@/lib/integrations/hevy";
import { CRONOMETER_MAX_BYTES, CronometerFormatError, importCronometerCsv } from "@/lib/integrations/cronometer";

export type ActionState = { ok: boolean; message: string; details?: string[] } | null;

function revalidate() {
  revalidatePath("/settings/integrations");
  revalidatePath("/log");
  revalidatePath("/dashboard");
}

export async function saveHevyKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireClient();
  const key = String(formData.get("apiKey") ?? "").trim();
  if (key.length < 10 || key.length > 200 || /\s/.test(key)) {
    return { ok: false, message: "That doesn’t look like a Hevy API key. Copy it from hevy.com/settings?developer." };
  }
  // A new key may belong to another Hevy account, so the next sync starts fresh (last 90 days).
  await ClientProfile.updateOne(
    { user: user._id },
    { $set: { "integrations.hevyApiKey": key }, $unset: { "integrations.hevyLastSyncAt": "" } },
    { upsert: true },
  );
  revalidate();
  return { ok: true, message: "Hevy key saved. Press “Sync now” to import your workouts." };
}

export async function removeHevyKey() {
  const user = await requireClient();
  await ClientProfile.updateOne(
    { user: user._id },
    { $unset: { "integrations.hevyApiKey": "", "integrations.hevyLastSyncAt": "" } },
  );
  revalidate();
}

export async function syncHevy(): Promise<ActionState> {
  const user = await requireClient();
  try {
    const r = await syncHevyWorkouts(user.id);
    revalidate();
    return {
      ok: true,
      message: `Synced ${r.fetched} workout${r.fetched === 1 ? "" : "s"}: ${r.created} new, ${r.updated} updated, ${r.unchanged} unchanged.`,
    };
  } catch (err) {
    if (err instanceof HevyApiError) return { ok: false, message: err.message };
    console.error("Hevy sync failed", err instanceof Error ? err.message : err);
    return { ok: false, message: "Hevy sync failed. Please try again later." };
  }
}

export async function uploadCronometerCsv(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file to upload." };
  if (file.size > CRONOMETER_MAX_BYTES) {
    return { ok: false, message: "File is larger than 1 MB. Export a shorter date range and upload it in parts." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) return { ok: false, message: "Upload the .csv file Cronometer exported." };

  try {
    const r = await importCronometerCsv(user.id, await file.text());
    revalidate();
    const details = r.skipped.slice(0, 10).map((s) => `Line ${s.line}: ${s.reason}`);
    if (r.skipped.length > 10) details.push(`…and ${r.skipped.length - 10} more skipped rows`);
    return {
      ok: true,
      message:
        `Imported ${r.rows - r.skipped.length} of ${r.rows} rows into ${r.meals} meals: ` +
        `${r.created} new, ${r.updated} updated, ${r.unchanged} unchanged` +
        (r.skipped.length ? `, ${r.skipped.length} rows skipped.` : "."),
      details,
    };
  } catch (err) {
    if (err instanceof CronometerFormatError) return { ok: false, message: err.message };
    console.error("Cronometer import failed", err instanceof Error ? err.message : err);
    return { ok: false, message: "Import failed. Please try again later." };
  }
}
