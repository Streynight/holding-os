export type WorkerType = "gpt" | "claude";

export interface HoldingRequest {
  message: string;
}

export interface HoldingResponse {
  content: string;
  metadata: {
    worker: WorkerType;
    reasoning: string;
    confidence: number;
    tokens_used: number;
    latency_ms: number;
    timestamp: string;
  };
}

export interface RouterDecision {
  worker: WorkerType;
  confidence: number;
  reasoning: string;
}
