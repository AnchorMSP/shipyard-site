import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { commentKeys } from "@/lib/kv-helpers";
import { Comment } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

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

    // Update by ID only. The slug list stores ids, so there is no shared
    // array to rewrite; this removes the read-modify-write on the slug key.
    await kv.set(commentKeys.byId(id), comment);

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Update comment error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

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

    // Remove the id from the slug list atomically, then delete the record.
    await kv.lrem(commentKeys.forSlug(comment.slug), 0, id);
    await kv.del(commentKeys.byId(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
