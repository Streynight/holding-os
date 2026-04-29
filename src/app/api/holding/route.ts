import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { smartClassifyTask } from "@/lib/smart-router";
import { callGPT } from "@/lib/workers/gpt";
import { callClaude } from "@/lib/workers/claude";
import { normalizeResponse } from "@/lib/workers/normalizer";
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

    // สร้าง conversationId ใหม่ถ้าไม่มี
    const convId = conversationId || randomUUID();

    // ดึง history
    const history = getHistory(convId);
    const historyForAI = formatHistoryForAI(history);

    // บันทึก user message
    addMessage(convId, "user", message);

    // Router ตัดสินใจ
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

    // เรียก worker พร้อม history
    const startTime = Date.now();
    let workerResponse;

    if (decision.worker === "gpt") {
      workerResponse = await callGPT(message, historyForAI);
    } else {
      workerResponse = await callClaude(message, historyForAI);
    }

    const latency = Date.now() - startTime;

    // บันทึก assistant response
    addMessage(convId, "assistant", workerResponse.content, decision.worker);

    // Normalize response
    const holdingResponse: HoldingResponse = {
      content: workerResponse.content.trim(),
      conversationId: convId,
      metadata: {
        worker: decision.worker,
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
