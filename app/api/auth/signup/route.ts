import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { userKeys } from "@/lib/kv-helpers";
import { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // Validate
    if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3-20 characters (letters, numbers, underscore)" }, { status: 400 });
    }
    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Create user
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id,
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const normalizedUsername = username.toLowerCase();

    // Reserve email and username atomically via SET NX. A concurrent signup
    // with the same email or username gets null back here and a 409 instead
    // of both passing the old check-then-set gap.
    const emailReservation = await kv.set<User>(userKeys.byEmail(email), user, { nx: true });
    if (emailReservation === null) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const usernameReservation = await kv.set<string>(userKeys.byUsername(normalizedUsername), id, { nx: true });
    if (usernameReservation === null) {
      // Release the email reservation so a later retry with a different
      // username can still register this email.
      await kv.del(userKeys.byEmail(email));
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    await kv.set(userKeys.byId(id), user);

    // Create session
    const response = NextResponse.json({ success: true, user: { id, username, email } });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = id;
    session.username = username;
    session.email = email;
    await session.save();

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
