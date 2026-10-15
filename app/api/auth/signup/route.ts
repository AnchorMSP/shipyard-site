import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { userKeys } from "@/lib/kv-helpers";
import { User } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  let id: string | undefined;
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
    const existingEmail = await kv.get<User>(userKeys.byEmail(email));
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user
    const newId = crypto.randomUUID();
    id = newId;
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: newId,
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await kv.set(userKeys.byEmail(email), user);
    await kv.set(userKeys.byUsername(username.toLowerCase()), id);
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
    logger.error("Signup failed", { userId: id, error });
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
