// Cronometer CSV import (no public API). See docs/integrations.md for the export files and columns.
import { connectDB } from "@/lib/db";
import { ClientProfile, MealLog, MEAL_TYPES } from "@/models";

type MealType = (typeof MEAL_TYPES)[number];

/** Upload limit. Server Action bodies are capped at 1 MB by default (next.config `serverActions.bodySizeLimit`). */
export const CRONOMETER_MAX_BYTES = 1_000_000;

/** A file the user uploaded is not a usable Cronometer export. The message is safe to show. */
export class CronometerFormatError extends Error {}

/** Minimal RFC 4180 parser: quoted fields, "" escapes, commas/newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Maps a Cronometer diary group ("Breakfast", "Snacks", custom names) to our meal type. */
export function mealTypeForGroup(group: string): MealType {
  const g = group.trim().toLowerCase();
  if (g === "breakfast") return "breakfast";
  if (g === "lunch") return "lunch";
  if (g === "dinner") return "dinner";
  return "snack";
}

export type CronometerMeal = {
  date: string;
  mealType: MealType;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: "cronometer";
  externalId: string; // `${day}:${group}`, shared by servings and grouped daily-summary rows
};

export type CronometerParseResult = {
  kind: "servings" | "dailySummary";
  meals: CronometerMeal[];
  rows: number;
  skipped: { line: number; reason: string }[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const round1 = (n: number) => Math.round(n * 10) / 10;
const toNum = (v: string | undefined) => {
  const n = parseFloat((v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parses a Cronometer export. Supports servings.csv ("Export Food & Recipe Entries") and
 * dailysummary.csv ("Export Daily Nutrition" with "Include diary group rows").
 * Produces one meal per (day, diary group) with summed calories and macros.
 */
export function parseCronometerCsv(text: string): CronometerParseResult {
  const [header, ...data] = parseCsv(text);
  if (!header) throw new CronometerFormatError("The file is empty.");
  const col = new Map(header.map((h, i) => [h.trim(), i]));
  const get = (r: string[], name: string) => {
    const i = col.get(name);
    return i === undefined ? undefined : r[i]?.trim();
  };

  const isServings = col.has("Day") && col.has("Food Name") && col.has("Group");
  const isDaily = col.has("Date") && col.has("Energy (kcal)") && !col.has("Food Name");
  if (!isServings && !isDaily) {
    if (col.has("Exercise")) throw new CronometerFormatError("This is the exercises export. Upload servings.csv (Food & Recipe Entries) instead.");
    if (col.has("Metric")) throw new CronometerFormatError("This is the biometrics export. Upload servings.csv (Food & Recipe Entries) instead.");
    throw new CronometerFormatError("Not a recognised Cronometer export. Upload servings.csv (Food & Recipe Entries).");
  }
  if (isDaily && !col.has("Group")) {
    throw new CronometerFormatError(
      "This daily summary has no meal breakdown. Re-export with “Include diary group rows” checked, or upload servings.csv.",
    );
  }

  const groups = new Map<string, CronometerMeal & { foods: string[] }>();
  const skipped: CronometerParseResult["skipped"] = [];

  data.forEach((r, i) => {
    const line = i + 2; // 1-based, after the header
    const day = get(r, isServings ? "Day" : "Date") ?? "";
    const group = get(r, "Group") ?? "";
    if (!DAY.test(day)) return skipped.push({ line, reason: `invalid day "${day}"` });
    if (!group) return skipped.push({ line, reason: isDaily ? "day total row (no diary group)" : "no diary group" });
    const food = isServings ? get(r, "Food Name") : undefined;
    if (isServings && !food) return skipped.push({ line, reason: "no food name" });

    const externalId = `${day}:${group}`;
    let meal = groups.get(externalId);
    if (!meal) {
      meal = {
        date: day,
        mealType: mealTypeForGroup(group),
        description: "",
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        source: "cronometer",
        externalId,
        foods: [],
      };
      groups.set(externalId, meal);
    }
    meal.calories += toNum(get(r, "Energy (kcal)"));
    meal.proteinG += toNum(get(r, "Protein (g)"));
    meal.carbsG += toNum(get(r, "Carbs (g)"));
    meal.fatG += toNum(get(r, "Fat (g)"));
    if (food) {
      const amount = get(r, "Amount");
      meal.foods.push(amount ? `${food} (${amount})` : food);
    }
  });

  const meals = [...groups.values()].map(({ foods, ...m }) => {
    const description = foods.length ? foods.join(", ") : `${m.externalId.slice(11)} (Cronometer daily summary)`;
    return {
      ...m,
      description: description.length > 1000 ? `${description.slice(0, 997)}…` : description,
      calories: Math.round(m.calories),
      proteinG: round1(m.proteinG),
      carbsG: round1(m.carbsG),
      fatG: round1(m.fatG),
    };
  });
  return { kind: isServings ? "servings" : "dailySummary", meals, rows: data.length, skipped };
}

export type CronometerImportResult = Omit<CronometerParseResult, "meals"> & {
  meals: number;
  created: number;
  updated: number;
  unchanged: number;
};

/** Parses and upserts a Cronometer CSV for one client. Re-importing the same file changes nothing. */
export async function importCronometerCsv(clientId: string, text: string): Promise<CronometerImportResult> {
  const parsed = parseCronometerCsv(text);
  await connectDB();
  const result: CronometerImportResult = { ...parsed, meals: parsed.meals.length, created: 0, updated: 0, unchanged: 0 };
  if (parsed.meals.length > 0) {
    const write = await MealLog.bulkWrite(
      parsed.meals.map(({ description, ...m }) => ({
        updateOne: {
          filter: { client: clientId, source: "cronometer", externalId: m.externalId },
          // A daily-summary row has no food names, so it must not overwrite a servings description.
          update:
            parsed.kind === "servings"
              ? { $set: { ...m, description, client: clientId } }
              : { $set: { ...m, client: clientId }, $setOnInsert: { description } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    result.created = write.upsertedCount;
    result.updated = write.modifiedCount;
    result.unchanged = write.matchedCount - write.modifiedCount;
  }
  await ClientProfile.updateOne({ user: clientId }, { $set: { "integrations.cronometerLastImportAt": new Date() } });
  return result;
}
