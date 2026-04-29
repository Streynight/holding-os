export type WorkerType = "gpt" | "claude";

export interface HoldingRequest {
  message: string;
  conversationId?: string;
  useSmartRouter?: boolean;
}

export interface HoldingResponse {
  content: string;
  conversationId: string;
  metadata: {
    worker: WorkerType;
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
  confidence: number;
  reasoning: string;
}
