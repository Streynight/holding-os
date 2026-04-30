import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { smartClassifyTask } from "@/lib/smart-router";
import { callGPT } from "@/lib/workers/gpt";
import { callClaude } from "@/lib/workers/claude";
import {
  createConversation,
  getConversation,
  addMessage,
  updateConversationTitle,
  getConversationMessages,
  getHistoryForAI,
} from "@/lib/storage";
import { generateTitle } from "@/lib/title-generator";
import { HoldingRequest, HoldingResponse } from "@/lib/types";

const DEFAULT_USER = "default-user";

export async function POST(request: NextRequest) {
  try {
    const body: HoldingRequest = await request.json();
    const {
      message,
      conversationId,
      userId = DEFAULT_USER,
      useSmartRouter = false,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // สร้างหรือดึง conversation
    let conv;
    if (conversationId) {
      conv = await getConversation(conversationId);
      if (!conv) conv = await createConversation(userId);
    } else {
      conv = await createConversation(userId);
    }

    // ดึง messages
    const existingMessages = await getConversationMessages(conv.id);
    const isFirstMessage = existingMessages.length === 0;
    const historyForAI = getHistoryForAI(existingMessages);

    // บันทึก user message
    await addMessage(conv.id, "user", message);

    // Router
    let decision;
    let routerType: "smart" | "keyword" = "keyword";

    if (useSmartRouter) {
      decision = await smartClassifyTask(message);
      routerType = "smart";
    } else {
      decision = classifyTask(message);
      routerType = "keyword";
    }

    console.log(`[ROUTER:${routerType.toUpperCase()}]`, decision);

    // เรียก worker
    const startTime = Date.now();
    let workerResponse;

    if (decision.worker === "gpt") {
      workerResponse = await callGPT(message, historyForAI, decision.model);
    } else {
      workerResponse = await callClaude(message, historyForAI, decision.model);
    }

    const latency = Date.now() - startTime;

    // บันทึก assistant response
    await addMessage(
      conv.id,
      "assistant",
      workerResponse.content,
      decision.worker,
      decision.model,
      workerResponse.tokens
    );

    // Auto title
    if (isFirstMessage) {
      generateTitle(message).then(title =>
        updateConversationTitle(conv.id, title)
      );
    }

    const holdingResponse: HoldingResponse = {
      content: workerResponse.content.trim(),
      conversationId: conv.id,
      userId,
      metadata: {
        worker: decision.worker,
        model: workerResponse.model,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        tokens_used: workerResponse.tokens,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
        router_type: routerType,
      },
    };

    return NextResponse.json(holdingResponse);
  } catch (error) {
    console.error("[ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
