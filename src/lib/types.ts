export type WorkerType = "gpt" | "claude";

export interface HoldingRequest {
  message: string;
  conversationId?: string;
  useSmartRouter?: boolean;
  useAgentPlanning?: boolean;
  useSwarmMode?: boolean;
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
    router_type: "smart" | "keyword" | "agent" | "swarm";
    strategy?: string;
    plan_steps?: unknown[];
  };
}

export interface RouterDecision {
  worker: WorkerType;
  model: string;
  confidence: number;
  reasoning: string;
}
