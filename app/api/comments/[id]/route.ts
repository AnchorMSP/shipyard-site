import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { commentKeys } from "@/lib/kv-helpers";
import { Comment } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  let userId: string | undefined;
  try {
    id = (await params).id;
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    userId = session.userId;

    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get comment
    const comment = await kv.get<Comment>(commentKeys.byId(id));
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify ownership
    if (comment.userId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { text } = await request.json();

    // Validate
    if (!text || typeof text !== "string" || text.length < 1 || text.length > 2000) {
      return NextResponse.json({ error: "Text must be 1-2000 characters" }, { status: 400 });
    }

    // Update comment
    comment.text = text;
    comment.updatedAt = new Date().toISOString();

    // Update in slug array
    const comments = (await kv.get<Comment[]>(commentKeys.forSlug(comment.slug))) || [];
    const index = comments.findIndex((c) => c.id === id);
    if (index !== -1) {
      comments[index] = comment;
      await kv.set(commentKeys.forSlug(comment.slug), comments);
    }

    // Update by ID
    await kv.set(commentKeys.byId(id), comment);

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    logger.error("Failed to update comment", { commentId: id, userId, error });
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  let userId: string | undefined;
  try {
    id = (await params).id;
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    userId = session.userId;

    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get comment
    const comment = await kv.get<Comment>(commentKeys.byId(id));
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify ownership
    if (comment.userId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Remove from slug array
    const comments = (await kv.get<Comment[]>(commentKeys.forSlug(comment.slug))) || [];
    const filtered = comments.filter((c) => c.id !== id);
    await kv.set(commentKeys.forSlug(comment.slug), filtered);

    // Delete by ID
    await kv.del(commentKeys.byId(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete comment", { commentId: id, userId, error });
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
