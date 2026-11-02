import { Schema } from "mongoose";
import { dayString, defineModel, SOURCES } from "./model";

// Client-reported data. Every log belongs to a client and a calendar day.
// Imported rows set `source` + `externalId`; the partial unique index prevents duplicate imports.

const importFields = {
  source: { type: String, enum: SOURCES, default: "manual" },
  externalId: String,
};
const importIndex = [
  { client: 1, source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
] as const;

// ---------- Meals ----------
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const mealLogSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: dayString,
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    calories: Number,
    proteinG: Number,
    carbsG: Number,
    fatG: Number,
    notes: { type: String, maxlength: 2000 },
    ...importFields,
  },
  { timestamps: true },
);
mealLogSchema.index({ client: 1, date: -1 });
mealLogSchema.index(...importIndex);
export const MealLog = defineModel("MealLog", mealLogSchema);

// ---------- Workouts ----------
const setSchema = new Schema(
  { reps: Number, weightKg: Number, durationSec: Number, distanceM: Number, rpe: Number },
  { _id: false },
);
const exerciseSchema = new Schema(
  { name: { type: String, required: true }, notes: String, sets: [setSchema] },
  { _id: false },
);

const workoutLogSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: dayString,
    title: { type: String, required: true, maxlength: 200 },
    durationMin: Number,
    exercises: [exerciseSchema],
    notes: { type: String, maxlength: 2000 },
    ...importFields,
  },
  { timestamps: true },
);
workoutLogSchema.index({ client: 1, date: -1 });
workoutLogSchema.index(...importIndex);
export const WorkoutLog = defineModel("WorkoutLog", workoutLogSchema);

// ---------- Other activities (steps, cardio, sleep, water, ...) ----------
export const ACTIVITY_TYPES = ["steps", "cardio", "sleep", "water", "mobility", "other"] as const;

const activityLogSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: dayString,
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    value: Number, // e.g. 8500 (steps), 30 (minutes), 7.5 (hours), 2 (litres)
    unit: String, // "steps" | "min" | "h" | "L" | free text
    notes: { type: String, maxlength: 1000 },
    ...importFields,
  },
  { timestamps: true },
);
activityLogSchema.index({ client: 1, date: -1 });
activityLogSchema.index(...importIndex);
export const ActivityLog = defineModel("ActivityLog", activityLogSchema);
