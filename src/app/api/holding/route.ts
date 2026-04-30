import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/router";
import { smartClassifyTask } from "@/lib/smart-router";
import { createPlan } from "@/lib/planner";
import { executePlan } from "@/lib/executor";
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

export const dynamic = "force-dynamic";

const DEFAULT_USER = "default-user";

function checkEnv(): string | null {
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  const hasUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const hasToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!hasUrl) missing.push("UPSTASH_REDIS_REST_URL (or KV_REST_API_URL)");
  if (!hasToken) missing.push("UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_TOKEN)");
  return missing.length ? `Missing env vars: ${missing.join(", ")}` : null;
}

export async function POST(request: NextRequest) {
  try {
    const envError = checkEnv();
    if (envError) return NextResponse.json({ error: envError }, { status: 500 });

    const body = await request.json();
    const {
      message,
      conversationId,
      userId = DEFAULT_USER,
      useSmartRouter = false,
      useAgentPlanning = false,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let conv;
    if (conversationId) {
      conv = await getConversation(conversationId);
      if (!conv) conv = await createConversation(userId);
    } else {
      conv = await createConversation(userId);
    }

    const existingMessages = await getConversationMessages(conv.id);
    const isFirstMessage = existingMessages.length === 0;
    const historyForAI = getHistoryForAI(existingMessages);

    await addMessage(conv.id, "user", message);

    let finalContent = "";
    let workerUsed = "claude";
    let modelUsed = "claude-sonnet-4-5";
    let routerType = "keyword";
    let confidence = 0.7;
    let reasoning = "";
    let strategy = "single";
    let totalTokens = 0;
    let planSteps: unknown[] = [];

    const startTime = Date.now();

    if (useAgentPlanning) {
      const plan = await createPlan(message);
      const result = await executePlan(plan, message, historyForAI);
      finalContent = result.finalContent;
      totalTokens = result.totalTokens;
      strategy = result.strategy;
      planSteps = result.steps;
      routerType = "agent";
      reasoning = plan.reasoning;
      const lastStep = result.steps[result.steps.length - 1];
      workerUsed = lastStep?.worker || "claude";
      modelUsed = lastStep?.model || "claude-sonnet-4-5";
      confidence = 0.9;
    } else if (useSmartRouter) {
      const decision = await smartClassifyTask(message);
      routerType = "smart";
      workerUsed = decision.worker;
      modelUsed = decision.model;
      confidence = decision.confidence;
      reasoning = decision.reasoning;
      const response =
        decision.worker === "gpt"
          ? await callGPT(message, historyForAI, decision.model)
          : await callClaude(message, historyForAI, decision.model);
      finalContent = response.content;
      totalTokens = response.tokens;
    } else {
      const decision = classifyTask(message);
      routerType = "keyword";
      workerUsed = decision.worker;
      modelUsed = decision.model;
      confidence = decision.confidence;
      reasoning = decision.reasoning;
      const response =
        decision.worker === "gpt"
          ? await callGPT(message, historyForAI, decision.model)
          : await callClaude(message, historyForAI, decision.model);
      finalContent = response.content;
      totalTokens = response.tokens;
    }

    const latency = Date.now() - startTime;

    await addMessage(conv.id, "assistant", finalContent, workerUsed, modelUsed, totalTokens);

    if (isFirstMessage) {
      generateTitle(message).then((title) => updateConversationTitle(conv.id, title));
    }

    return NextResponse.json({
      content: finalContent.trim(),
      conversationId: conv.id,
      userId,
      metadata: {
        worker: workerUsed,
        model: modelUsed,
        reasoning,
        confidence,
        tokens_used: totalTokens,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
        router_type: routerType,
        strategy,
        plan_steps: planSteps,
      },
    });
  } catch (error) {
    console.error("[ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
