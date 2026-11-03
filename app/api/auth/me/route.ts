import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    if (session.userId && session.username && session.email) {
      return NextResponse.json({ user: { id: session.userId, username: session.username, email: session.email } });
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    // A failure to read the session must not be reported as "not signed in"; that
    // would turn a runtime fault into a fabricated logged-out state.
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Failed to check session" }, { status: 500 });
  }
}
