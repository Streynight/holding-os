import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return new Redis({ url: url!, token: token! });
}

export interface Feedback {
  id: string;
  conversationId: string;
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  worker: string;
  model: string;
  comment?: string;
  createdAt: string;
}

export async function saveFeedback(
  conversationId: string,
  messageId: string,
  rating: number,
  worker: string,
  model: string,
  comment?: string
): Promise<Feedback> {
  const redis = getRedis();
  const feedback: Feedback = {
    id: randomUUID(),
    conversationId,
    messageId,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    worker,
    model,
    comment,
    createdAt: new Date().toISOString(),
  };

  await redis.rpush("feedbacks", feedback);
  await redis.incr(`stats:${worker}:${model}:total`);
  await redis.incrby(`stats:${worker}:${model}:rating`, rating);

  return feedback;
}

export async function getWorkerStats(): Promise<
  Record<string, { avgRating: number; total: number }>
> {
  const redis = getRedis();
  const workers = [
    { worker: "gpt", model: "gpt-5.5" },
    { worker: "gpt", model: "gpt-5.4-mini" },
    { worker: "claude", model: "claude-sonnet-4-5" },
  ];

  const stats: Record<string, { avgRating: number; total: number }> = {};

  for (const { worker, model } of workers) {
    const key = `${worker}:${model}`;
    const total = (await redis.get<number>(`stats:${key}:total`)) ?? 0;
    const ratingSum = (await redis.get<number>(`stats:${key}:rating`)) ?? 0;
    stats[key] = {
      total: Number(total),
      avgRating: total > 0 ? Number(ratingSum) / Number(total) : 0,
    };
  }

  return stats;
}
