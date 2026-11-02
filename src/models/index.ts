import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

// ---------- User ----------
const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: String,
    image: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    blocked: { type: Boolean, default: false },
    // Long-lived Google token used to call the Calendar API on the user's behalf.
    googleRefreshToken: { type: String, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

// ---------- Announcement (admin -> everyone) ----------
const announcementSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// ---------- Message (two-way channel between one user and the admin team) ----------
const messageSchema = new Schema(
  {
    // The user this conversation belongs to. Admin replies use the same value.
    conversation: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromAdmin: { type: Boolean, required: true },
    body: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: true },
);

// ---------- Video (embedded YouTube / Vimeo) ----------
const videoSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String, required: true },
    embedUrl: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// `models.X ??` avoids "OverwriteModelError" when Next.js hot-reloads this file.
export const User =
  (models.User as Model<InferSchemaType<typeof userSchema>>) ?? model("User", userSchema);
export const Announcement =
  (models.Announcement as Model<InferSchemaType<typeof announcementSchema>>) ??
  model("Announcement", announcementSchema);
export const Message =
  (models.Message as Model<InferSchemaType<typeof messageSchema>>) ?? model("Message", messageSchema);
export const Video =
  (models.Video as Model<InferSchemaType<typeof videoSchema>>) ?? model("Video", videoSchema);
