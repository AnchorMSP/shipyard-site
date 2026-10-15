import { SessionOptions } from "iron-session";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET environment variable is required and must be at least 32 characters. Generate one with `openssl rand -base64 32` and set it in the Vercel project (Production, Preview, and Development)."
  );
}

// ponytail: iron-session (7 methods) over NextAuth (overkill for email/pass only)
export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "shipyard_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export interface SessionData {
  userId: string;
  username: string;
  email: string;
}
