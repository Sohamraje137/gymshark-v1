import { Schema } from "mongoose";
import { dayString, defineModel } from "./model";

// ---------- Weekly check-in (client fills in, coach reviews) ----------
const rating = { type: Number, min: 1, max: 5 };

const checkInSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekOf: dayString, // Monday of the week being reported on
    weightKg: Number,
    waistCm: Number,
    energy: rating,
    sleepQuality: rating,
    stress: rating,
    hunger: rating,
    adherence: rating, // how well the plan was followed
    wins: { type: String, maxlength: 3000 },
    struggles: { type: String, maxlength: 3000 },
    questions: { type: String, maxlength: 3000 },
    coachFeedback: { type: String, maxlength: 5000 },
    reviewedAt: Date,
  },
  { timestamps: true },
);
checkInSchema.index({ client: 1, weekOf: -1 }, { unique: true });
export const CheckIn = defineModel("CheckIn", checkInSchema);

// ---------- Scheduled calls between coach and client ----------
export const SESSION_TYPES = ["onboarding", "weekly_checkin", "monthly_review", "catch_up"] as const;
export const SESSION_STATUSES = ["scheduled", "completed", "cancelled"] as const;

const coachingSessionSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: SESSION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: SESSION_STATUSES, default: "scheduled" },
    agenda: { type: String, maxlength: 5000 },
    outcome: { type: String, maxlength: 5000 }, // coach's notes after the call
    meetUrl: String,
    googleEventId: String, // event in the coach's Google Calendar
  },
  { timestamps: true },
);
coachingSessionSchema.index({ client: 1, startsAt: -1 });
coachingSessionSchema.index({ coach: 1, startsAt: 1 });
export const CoachingSession = defineModel("CoachingSession", coachingSessionSchema);

// ---------- Coach's private notes about a client ----------
const coachNoteSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 10000 },
    pinned: { type: Boolean, default: false },
    tags: [String],
  },
  { timestamps: true },
);
export const CoachNote = defineModel("CoachNote", coachNoteSchema);
