import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveFeedback, getWorkerStats } from "@/lib/feedback";
import { getConversation } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const body = await request.json();
    const { conversationId, messageId, rating, worker, model, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const conv = await getConversation(conversationId);
    if (!conv || conv.userId !== authResult.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const feedback = await saveFeedback(
      conversationId,
      messageId,
      rating,
      worker,
      model,
      comment
    );

    return NextResponse.json({ success: true, feedback });
  } catch {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const stats = await getWorkerStats();
    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
