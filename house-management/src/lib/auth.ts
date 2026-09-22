import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

function getAllowedUsers(): string[] {
  return (process.env.ALLOWED_USERS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    // JWT sessions so next-auth's edge-compatible middleware (used to
    // gate every page behind login) can read the session without a DB
    // round trip. The adapter still persists Google's access_token /
    // refresh_token on the Account row regardless of session strategy,
    // which is what /api/calendar/weekly reads from.
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          // offline access + prompt=consent so we reliably get a
          // refresh_token back (needed to read the calendar later
          // without the user having to sign in again).
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const allowed = getAllowedUsers();
      if (allowed.length === 0) {
        // Fail closed: if ALLOWED_USERS isn't configured, nobody can log in.
        // This avoids accidentally leaving the dashboard open to anyone
        // with a Google account.
        return false;
      }
      if (!user.email) return false;
      return allowed.includes(user.email.toLowerCase());
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
