import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { callGPT } from "@/lib/workers/gpt";
import { callClaude } from "@/lib/workers/claude";
import { normalizeResponse } from "@/lib/workers/normalizer";
import {
  createConversation,
  addMessage,
  getConversation,
  getConversationHistory,
} from "@/lib/storage";
import { HoldingRequest, HoldingResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: HoldingRequest = await request.json();
    const { message, conversationId: providedConvId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let conversationId = providedConvId;
    if (!conversationId) conversationId = createConversation();

    const existingConv = getConversation(conversationId);
    if (!existingConv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    addMessage(conversationId, {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    const history = getConversationHistory(conversationId);
    const decision = classifyTask(message, history);

    const startTime = Date.now();

    const workerResponse =
      decision.worker === "gpt"
        ? await callGPT(message, history)
        : await callClaude(message, history);

    const latency = Date.now() - startTime;

    addMessage(conversationId, {
      role: "assistant",
      content: workerResponse.content,
      worker: decision.worker,
      timestamp: new Date().toISOString(),
    });

    const holdingResponse: HoldingResponse = normalizeResponse(
      workerResponse.content,
      decision.worker,
      decision.reasoning,
      decision.confidence,
      workerResponse.tokens,
      latency
    );

    return NextResponse.json({
      ...holdingResponse,
      conversationId,
    });
  } catch (error) {
    console.error("[HOLDING ERROR]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
