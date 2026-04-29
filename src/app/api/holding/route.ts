import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { callGPT } from "@/lib/workers/gpt";
import { callClaude } from "@/lib/workers/claude";
import { normalizeResponse } from "@/lib/workers/normalizer";
import { HoldingRequest, HoldingResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: HoldingRequest = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const decision = classifyTask(message);
    console.log("[ROUTER]", decision);

    const startTime = Date.now();
    let workerResponse;

    if (decision.worker === "gpt") {
      workerResponse = await callGPT(message);
    } else {
      workerResponse = await callClaude(message);
    }

    const latency = Date.now() - startTime;

    const holdingResponse: HoldingResponse = normalizeResponse(
      workerResponse.content,
      decision.worker,
      decision.reasoning,
      decision.confidence,
      workerResponse.tokens,
      latency
    );

    return NextResponse.json(holdingResponse);
  } catch (error) {
    console.error("[ERROR]", error);

    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
