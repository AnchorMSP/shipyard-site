import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { commentKeys } from "@/lib/kv-helpers";
import { Comment } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  let slug: string | null = null;
  try {
    slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    const comments = (await kv.get<Comment[]>(commentKeys.forSlug(slug))) || [];
    // Sort newest first
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ comments });
  } catch (error) {
    logger.error("Failed to fetch comments", { slug, error });
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let slug: string | undefined;
  let userId: string | undefined;
  try {
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    userId = session.userId;

    if (!session.userId || !session.username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug: bodySlug, text } = await request.json();
    slug = bodySlug;

    // Validate
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }
    if (!text || typeof text !== "string" || text.length < 1 || text.length > 2000) {
      return NextResponse.json({ error: "Text must be 1-2000 characters" }, { status: 400 });
    }

    // Create comment
    const id = crypto.randomUUID();
    const comment: Comment = {
      id,
      slug,
      userId: session.userId,
      username: session.username,
      text,
      createdAt: new Date().toISOString(),
    };

    // Append to array
    const comments = (await kv.get<Comment[]>(commentKeys.forSlug(slug))) || [];
    comments.push(comment);
    await kv.set(commentKeys.forSlug(slug), comments);
    await kv.set(commentKeys.byId(id), comment);

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    logger.error("Failed to post comment", { slug, userId, error });
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
