import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    userId = session.userId;
    session.destroy();
    return response;
  } catch (error) {
    logger.error("Logout failed", { userId, error });
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
