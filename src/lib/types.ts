export type WorkerType = "gpt" | "claude";

export interface HoldingRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  useSmartRouter?: boolean;
}

export interface HoldingResponse {
  content: string;
  conversationId: string;
  userId: string;
  metadata: {
    worker: WorkerType;
    model: string;
    reasoning: string;
    confidence: number;
    tokens_used: number;
    latency_ms: number;
    timestamp: string;
    router_type: "smart" | "keyword";
  };
}

export interface RouterDecision {
  worker: WorkerType;
  model: string;
  confidence: number;
  reasoning: string;
}
