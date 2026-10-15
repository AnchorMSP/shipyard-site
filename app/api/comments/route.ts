import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { commentKeys } from "@/lib/kv-helpers";
import { getContentBySlug } from "@/lib/content";
import { Comment } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    const comments = (await kv.get<Comment[]>(commentKeys.forSlug(slug))) || [];
    // Sort newest first
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    if (!session.userId || !session.username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug, text } = await request.json();

    // Validate
    if (!slug || typeof slug !== "string" || slug.length > 200) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }
    if (!text || typeof text !== "string" || text.length < 1 || text.length > 2000) {
      return NextResponse.json({ error: "Text must be 1-2000 characters" }, { status: 400 });
    }

    // The slug becomes part of a KV key name (`comments:<slug>`), and kv.set
    // creates the key when it is missing. Only slugs of published articles may
    // be commented on; otherwise any account can create a persistent key in the
    // app's only data store for every string it invents.
    if (!(await getContentBySlug(slug))) {
      return NextResponse.json({ error: "Unknown slug" }, { status: 404 });
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
    console.error("Post comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
