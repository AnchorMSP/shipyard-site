import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { normalizeEmail, userKeys } from "@/lib/kv-helpers";
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

    // Check if username exists
    const existingUsername = await kv.get(userKeys.byUsername(username.toLowerCase()));
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // Check if email exists
    const normalizedEmail = normalizeEmail(email);
    let existingEmail = await kv.get<User>(userKeys.byEmail(normalizedEmail));
    if (!existingEmail && email !== normalizedEmail) {
      // An account created before normalization may still live under the raw typed key.
      existingEmail = await kv.get<User>(userKeys.byRawEmail(email));
    }
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id,
      username,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await kv.set(userKeys.byEmail(normalizedEmail), user);
    await kv.set(userKeys.byUsername(username.toLowerCase()), id);
    await kv.set(userKeys.byId(id), user);

    // Create session
    const response = NextResponse.json({ success: true, user: { id, username, email: normalizedEmail } });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = id;
    session.username = username;
    session.email = normalizedEmail;
    await session.save();

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
