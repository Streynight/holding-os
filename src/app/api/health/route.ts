import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // Env vars — accept both Upstash and legacy Vercel KV naming
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  checks["OPENAI_API_KEY"] = process.env.OPENAI_API_KEY
    ? { ok: true, detail: "set" } : { ok: false, detail: "MISSING" };
  checks["ANTHROPIC_API_KEY"] = process.env.ANTHROPIC_API_KEY
    ? { ok: true, detail: "set" } : { ok: false, detail: "MISSING" };
  checks["REDIS_URL"] = redisUrl
    ? { ok: true, detail: "set" } : { ok: false, detail: "MISSING (need UPSTASH_REDIS_REST_URL or KV_REST_API_URL)" };
  checks["REDIS_TOKEN"] = redisToken
    ? { ok: true, detail: "set" } : { ok: false, detail: "MISSING (need UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN)" };

  // Redis ping
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url: redisUrl!, token: redisToken! });
    await redis.set("__health__", "1", { ex: 10 });
    const val = await redis.get("__health__");
    checks["redis"] = val === "1"
      ? { ok: true, detail: "ping ok" }
      : { ok: false, detail: `unexpected value: ${val}` };
  } catch (e) {
    checks["redis"] = { ok: false, detail: String(e) };
  }

  // OpenAI
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const models = await client.models.list();
    const ids = models.data.slice(0, 3).map((m: { id: string }) => m.id);
    checks["openai"] = { ok: true, detail: `reachable — sample models: ${ids.join(", ")}` };
  } catch (e) {
    checks["openai"] = { ok: false, detail: String(e) };
  }

  // Anthropic
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    checks["anthropic"] = { ok: true, detail: "reachable" };
  } catch (e) {
    checks["anthropic"] = { ok: false, detail: String(e) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 500 });
}
