import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { connectDB } from "@/lib/db";
import { upsertUserOnLogin } from "@/lib/users";
import { User, type Role } from "@/models";

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

/**
 * Dev login: sign in as any email without Google, for building features before Google approves the app.
 * Only on when DEV_LOGIN_ENABLED=true. In production it additionally requires DEV_LOGIN_PASSCODE.
 */
export const devLoginEnabled =
  process.env.DEV_LOGIN_ENABLED === "true" &&
  (process.env.NODE_ENV !== "production" || !!process.env.DEV_LOGIN_PASSCODE);

const providers: Provider[] = [
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
];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: {}, name: {}, role: {}, passcode: {} },
      async authorize(c) {
        const email = String(c.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+$/.test(email)) return null;
        const passcode = process.env.DEV_LOGIN_PASSCODE;
        if (passcode && c.passcode !== passcode) return null;

        const user = await upsertUserOnLogin({
          email,
          name: String(c.name ?? "").trim() || email.split("@")[0],
          roleIfNew: c.role === "coach" ? "coach" : "client",
        });
        if (user.blocked) return null;
        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Sessions live in a signed + encrypted JWT cookie, not in the database.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  pages: { signIn: "/" },
  callbacks: {
    // Google login: create/update the user in MongoDB. (Dev login does this in authorize().)
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || !profile.sub || !profile.email_verified) return false;
      const user = await upsertUserOnLogin({
        email: profile.email,
        name: profile.name,
        image: profile.picture,
        googleId: profile.sub,
        googleRefreshToken: account.refresh_token,
      });
      return !user.blocked;
    },

    // Runs whenever the JWT is created or read. Only touches the DB right after login.
    async jwt({ token, user }) {
      if (user?.email) {
        await connectDB();
        const doc = await User.findOne({ email: user.email.toLowerCase() }).lean();
        if (doc) {
          token.uid = doc._id.toString();
          token.role = doc.role as Role;
        }
      }
      return token;
    },

    session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.user.role = token.role ?? "client";
      return session;
    },
  },
});
