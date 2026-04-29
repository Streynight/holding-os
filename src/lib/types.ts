export type WorkerType = "gpt" | "claude";
export type GPTModel = "gpt-5.5" | "gpt-5.4-mini";
export type ClaudeModel = "claude-sonnet-4-5";

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
