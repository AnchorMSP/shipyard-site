import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { commentKeys } from "@/lib/kv-helpers";
import { Comment } from "@/lib/types";

async function getCommentsFromList(slug: string): Promise<Comment[]> {
  const ids = await kv.lrange<string>(commentKeys.forSlug(slug), 0, -1);
  if (!ids.length) return [];
  const records = await kv.mget<Comment[]>(...ids.map((id) => commentKeys.byId(id)));
  return records.filter((comment): comment is Comment => comment !== null);
}

async function appendCommentId(slug: string, id: string): Promise<void> {
  const key = commentKeys.forSlug(slug);
  // If a legacy JSON-array key is still present, migrate it to a list of ids
  // in place before appending, so existing comments survive the format change.
  if ((await kv.type(key)) === "string") {
    const legacy = (await kv.get<Comment[]>(key)) || [];
    const ids = legacy.map((comment) => comment.id);
    await kv.set(key, ids);
  }
  await kv.rpush(key, id);
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    // The slug key is a Redis list of comment ids in the current format, but
    // keys written before this change hold a JSON array. Read both so legacy
    // data stays visible while writes migrate it to the list format.
    const keyType = await kv.type(commentKeys.forSlug(slug));
    if (keyType === 'none') {
      return NextResponse.json({ comments: [] });
    }

    const comments =
      keyType === 'list'
        ? await getCommentsFromList(slug)
        : (await kv.get<Comment[]>(commentKeys.forSlug(slug))) || [];

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

    // Append the id to the per-slug list atomically, then store the record.
    // rpush is atomic, so concurrent posts can no longer clobber each other.
    await appendCommentId(slug, id);
    await kv.set(commentKeys.byId(id), comment);

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Post comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
