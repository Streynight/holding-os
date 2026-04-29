import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { smartClassifyTask } from "@/lib/smart-router";
import { callGPT } from "@/lib/workers/gpt";
import { callClaude } from "@/lib/workers/claude";
import { addMessage, getHistory, formatHistoryForAI } from "@/lib/memory";
import { HoldingRequest, HoldingResponse } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body: HoldingRequest = await request.json();
    const { message, conversationId, useSmartRouter = false } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const convId = conversationId || randomUUID();
    const history = getHistory(convId);
    const historyForAI = formatHistoryForAI(history);

    addMessage(convId, "user", message);

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

    const startTime = Date.now();
    let workerResponse;

    if (decision.worker === "gpt") {
      workerResponse = await callGPT(message, historyForAI, decision.model);
    } else {
      workerResponse = await callClaude(message, historyForAI, decision.model);
    }

    const latency = Date.now() - startTime;

    addMessage(convId, "assistant", workerResponse.content, decision.worker);

    const holdingResponse: HoldingResponse = {
      content: workerResponse.content.trim(),
      conversationId: convId,
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
