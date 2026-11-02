import { Schema } from "mongoose";
import { defineModel } from "./model";

export const CLIENT_STATUSES = ["onboarding", "active", "paused", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

/** Everything the coach knows about one client. One document per client user. */
const clientProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: CLIENT_STATUSES, default: "onboarding" },
    timeZone: { type: String, default: "UTC" }, // IANA zone, used to compute the client's "today"

    // Intake answers, filled in by the client during onboarding.
    onboarding: {
      goals: String,
      dateOfBirth: String, // YYYY-MM-DD
      sex: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
      heightCm: Number,
      startWeightKg: Number,
      targetWeightKg: Number,
      activityLevel: { type: String, enum: ["sedentary", "light", "moderate", "very_active"] },
      trainingExperience: { type: String, enum: ["beginner", "intermediate", "advanced"] },
      healthConditions: String,
      injuries: String,
      medications: String,
      dietaryPreferences: String,
      availability: String,
      completedAt: Date,
    },

    // Daily/weekly targets, set by the coach.
    targets: {
      calories: Number,
      proteinG: Number,
      carbsG: Number,
      fatG: Number,
      steps: Number,
      workoutsPerWeek: Number,
    },

    // Third-party connections. Secrets are never selected by default.
    integrations: {
      hevyApiKey: { type: String, select: false },
      hevyLastSyncAt: Date,
      cronometerLastImportAt: Date,
    },
  },
  { timestamps: true },
);

export const ClientProfile = defineModel("ClientProfile", clientProfileSchema);
