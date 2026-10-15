import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { userKeys } from "@/lib/kv-helpers";
import { User } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Get user
    const user = await kv.get<User>(userKeys.byEmail(email));
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
    logger.error("Login failed", { error });
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
