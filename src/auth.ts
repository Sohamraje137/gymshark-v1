import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import { User } from "@/models";

export type Role = "user" | "admin";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
  }
}

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Sessions live in a signed + encrypted JWT cookie, not in the database.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are read from the environment automatically.
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline", // ask Google for a refresh token
          prompt: "consent", // always return the refresh token, even on repeat sign-ins
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  pages: { signIn: "/" },
  callbacks: {
    // Runs once per Google login: create/update the user in MongoDB.
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email || !profile.sub) return false;
      if (!profile.email_verified) return false;

      await connectDB();
      const email = profile.email.toLowerCase();
      const isListedAdmin = adminEmails.includes(email);

      const user = await User.findOneAndUpdate(
        { googleId: profile.sub },
        {
          $set: {
            email,
            name: profile.name,
            image: profile.picture,
            lastLoginAt: new Date(),
            ...(account.refresh_token && { googleRefreshToken: account.refresh_token }),
            ...(isListedAdmin && { role: "admin" }),
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
      return !user.blocked;
    },

    // Runs whenever the JWT is created or read. Only touches the DB right after login.
    async jwt({ token, account, profile }) {
      if (account && profile?.sub) {
        await connectDB();
        const user = await User.findOne({ googleId: profile.sub }).lean();
        if (user) {
          token.uid = user._id.toString();
          token.role = user.role as Role;
        }
      }
      return token;
    },

    session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.user.role = token.role ?? "user";
      return session;
    },
  },
});
