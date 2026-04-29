import { HoldingResponse, WorkerType } from "../types";

export function normalizeResponse(
  workerContent: string,
  worker: WorkerType,
  model: string,
  reasoning: string,
  confidence: number,
  tokens: number,
  latency: number,
  conversationId: string,
  routerType: "smart" | "keyword" = "keyword"
): HoldingResponse {
  return {
    content: workerContent.trim(),
    conversationId,
    metadata: {
      worker,
      model,
      reasoning,
      confidence,
      tokens_used: tokens,
      latency_ms: latency,
      timestamp: new Date().toISOString(),
      router_type: routerType,
    },
  };
}
