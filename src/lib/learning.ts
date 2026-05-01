import { Redis } from "@upstash/redis";
import { RouterDecision, WorkerType } from "./types";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return new Redis({ url: url!, token: token! });
}

const TASK_PATTERNS: Array<{ signature: string; keywords: string[] }> = [
  {
    signature: "coding-debug",
    keywords: ["debug", "bug", "error", "fix", "line", "stack", "แก้บัค", "โค้ด", "พัง"],
  },
  {
    signature: "coding-build",
    keywords: ["code", "implement", "build", "create app", "website", "game", "เขียนโค้ด", "สร้าง"],
  },
  {
    signature: "analysis-planning",
    keywords: ["analyze", "strategy", "plan", "architecture", "วิเคราะห์", "วางแผน", "ออกแบบ"],
  },
  {
    signature: "explain-summary",
    keywords: ["explain", "summarize", "why", "how", "อธิบาย", "สรุป", "ทำไม"],
  },
];

export function getTaskSignature(message: string): string {
  const lower = message.toLowerCase();
  return (
    TASK_PATTERNS.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)))
      ?.signature ?? "general"
  );
}

export function isPositiveLearningSignal(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return [
    "thanks",
    "thank you",
    "great",
    "good",
    "perfect",
    "ขอบคุณ",
    "ดีมาก",
    "เยี่ยม",
    "โอเค",
    "ผ่าน",
  ].some((signal) => lower.includes(signal));
}

export async function recordLearningSignal(input: {
  message: string;
  worker: string;
  model: string;
  score: number;
  source: "rating" | "thanks" | "implicit";
}): Promise<void> {
  const redis = getRedis();
  const signature = getTaskSignature(input.message);
  const routeKey = `learning:${signature}:${input.worker}:${input.model}`;

  await Promise.all([
    redis.incrbyfloat(`${routeKey}:score`, input.score),
    redis.incr(`${routeKey}:count`),
    redis.rpush("learning:events", {
      signature,
      worker: input.worker,
      model: input.model,
      score: input.score,
      source: input.source,
      createdAt: new Date().toISOString(),
    }),
    redis.ltrim("learning:events", -1000, -1),
  ]);
}

export async function applyLearning(
  message: string,
  decision: RouterDecision
): Promise<RouterDecision> {
  const redis = getRedis();
  const signature = getTaskSignature(message);
  const candidates: Array<{ worker: WorkerType; model: string }> = [
    { worker: "claude", model: "claude-sonnet-4-5" },
    { worker: "gpt", model: "gpt-5.5" },
    { worker: "gpt", model: "gpt-5.4-mini" },
  ];

  const learned = await Promise.all(
    candidates.map(async (candidate) => {
      const key = `learning:${signature}:${candidate.worker}:${candidate.model}`;
      const [score, count] = await Promise.all([
        redis.get<number>(`${key}:score`),
        redis.get<number>(`${key}:count`),
      ]);
      return {
        ...candidate,
        score: Number(score ?? 0),
        count: Number(count ?? 0),
      };
    })
  );

  const best = learned
    .filter((item) => item.count >= 2 && item.score > 0)
    .sort((a, b) => b.score / b.count - a.score / a.count)[0];

  if (!best || (best.worker === decision.worker && best.model === decision.model)) {
    return decision;
  }

  return {
    worker: best.worker,
    model: best.model,
    confidence: Math.max(decision.confidence, 0.75),
    reasoning: `${decision.reasoning} | Learned preference for ${signature}: ${best.worker}/${best.model}`,
  };
}
