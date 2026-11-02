import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./model";

export const ROLES = ["coach", "client"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    // Absent for users created through dev login; filled in on their first Google sign-in.
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: String,
    image: String,
    role: { type: String, enum: ROLES, default: "client" },
    blocked: { type: Boolean, default: false },
    // Long-lived Google token used to call the Calendar API on the user's behalf.
    googleRefreshToken: { type: String, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = defineModel("User", userSchema);
