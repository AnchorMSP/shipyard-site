import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  try {
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    userId = session.userId;

    if (session.userId && session.username && session.email) {
      return NextResponse.json({ user: { id: session.userId, username: session.username, email: session.email } });
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    logger.error("Auth check failed", { userId, error });
    return NextResponse.json({ user: null });
  }
}
