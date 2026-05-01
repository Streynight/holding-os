import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return new Redis({ url: url!, token: token! });
}

export interface RequestLog {
  id: string;
  route: string;
  method: string;
  userId: string;
  conversationId?: string;
  routerType?: string;
  worker?: string;
  model?: string;
  strategy?: string;
  tokens: number;
  latencyMs: number;
  status: "success" | "error";
  error?: string;
  createdAt: string;
}

export async function recordRequestLog(
  log: Omit<RequestLog, "id" | "createdAt">
): Promise<void> {
  try {
    const redis = getRedis();
    const entry: RequestLog = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...log,
    };

    await Promise.all([
      redis.rpush("monitoring:requests", entry),
      redis.ltrim("monitoring:requests", -1000, -1),
      redis.incr("monitoring:total_requests"),
      redis.incrby("monitoring:total_tokens", log.tokens),
      redis.incrby("monitoring:total_latency_ms", log.latencyMs),
      log.status === "error" ? redis.incr("monitoring:total_errors") : Promise.resolve(),
      log.worker ? redis.incr(`monitoring:worker:${log.worker}:requests`) : Promise.resolve(),
      log.routerType ? redis.incr(`monitoring:router:${log.routerType}:requests`) : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[MONITORING_ERROR]", error);
  }
}

export async function getMonitoringSnapshot(limit = 50): Promise<{
  summary: {
    totalRequests: number;
    totalErrors: number;
    totalTokens: number;
    averageLatencyMs: number;
  };
  requests: RequestLog[];
}> {
  const redis = getRedis();
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const [totalRequests, totalErrors, totalTokens, totalLatencyMs, requests] =
    await Promise.all([
      redis.get<number>("monitoring:total_requests"),
      redis.get<number>("monitoring:total_errors"),
      redis.get<number>("monitoring:total_tokens"),
      redis.get<number>("monitoring:total_latency_ms"),
      redis.lrange<RequestLog>("monitoring:requests", -safeLimit, -1),
    ]);

  const requestCount = Number(totalRequests ?? 0);

  return {
    summary: {
      totalRequests: requestCount,
      totalErrors: Number(totalErrors ?? 0),
      totalTokens: Number(totalTokens ?? 0),
      averageLatencyMs:
        requestCount > 0 ? Math.round(Number(totalLatencyMs ?? 0) / requestCount) : 0,
    },
    requests: requests.reverse(),
  };
}
