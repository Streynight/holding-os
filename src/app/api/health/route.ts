import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // Env vars
  const vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  for (const v of vars) {
    checks[v] = process.env[v]
      ? { ok: true, detail: "set" }
      : { ok: false, detail: "MISSING" };
  }

  // Redis ping
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
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
