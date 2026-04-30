import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, getWorkerStats } from "@/lib/feedback";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, messageId, rating, worker, model, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await getWorkerStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
