import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { normalizeEmail, userKeys } from "@/lib/kv-helpers";
import { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Get user
    const normalizedEmail = normalizeEmail(email);
    let user = await kv.get<User>(userKeys.byEmail(normalizedEmail));
    if (!user && email !== normalizedEmail) {
      // Accounts created before email normalization kept the raw typed string as their
      // key, so a mixed-case sign-in still resolves instead of failing as a bad password.
      user = await kv.get<User>(userKeys.byRawEmail(email));
    }
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create session
    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = user.id;
    session.username = user.username;
    session.email = user.email;
    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
