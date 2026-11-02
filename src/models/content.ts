import { Schema } from "mongoose";
import { defineModel } from "./model";

// ---------- Announcement (coach -> all clients) ----------
const announcementSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
export const Announcement = defineModel("Announcement", announcementSchema);

// ---------- Message (two-way channel between one client and the coach) ----------
const messageSchema = new Schema(
  {
    // The client this conversation belongs to. Coach replies use the same value.
    conversation: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromCoach: { type: Boolean, required: true },
    body: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: true },
);
export const Message = defineModel("Message", messageSchema);

// ---------- Video (embedded YouTube / Vimeo, e.g. exercise demos) ----------
const videoSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String, required: true },
    embedUrl: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
export const Video = defineModel("Video", videoSchema);
