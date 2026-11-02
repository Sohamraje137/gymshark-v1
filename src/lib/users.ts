import "server-only";
import { connectDB } from "@/lib/db";
import { ClientProfile, User, type Role } from "@/models";

export const coachEmails = (process.env.COACH_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Creates or updates a user when they log in (Google or dev login), keyed by email.
 * People listed in COACH_EMAILS are always coaches. Clients get a ClientProfile.
 */
export async function upsertUserOnLogin(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  googleId?: string;
  googleRefreshToken?: string;
  /** Name and role for a brand-new user (dev login only). Ignored for existing users. */
  nameIfNew?: string;
  roleIfNew?: Role;
}) {
  await connectDB();
  const email = input.email.toLowerCase();
  const isListedCoach = coachEmails.includes(email);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        lastLoginAt: new Date(),
        ...(input.name && { name: input.name }),
        ...(input.image && { image: input.image }),
        ...(input.googleId && { googleId: input.googleId }),
        ...(input.googleRefreshToken && { googleRefreshToken: input.googleRefreshToken }),
        ...(isListedCoach && { role: "coach" }),
      },
      $setOnInsert: {
        ...(input.nameIfNew && !input.name && { name: input.nameIfNew }),
        ...(!isListedCoach && { role: input.roleIfNew ?? "client" }),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  if (user.role === "client") {
    await ClientProfile.updateOne({ user: user._id }, { $setOnInsert: { user: user._id } }, { upsert: true });
  }
  return user;
}
