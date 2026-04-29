import Anthropic from "@anthropic-ai/sdk";
import { RouterDecision, WorkerType } from "./types";
import { classifyTask } from "./router";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function smartClassifyTask(
  message: string
): Promise<RouterDecision> {
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `You are a task router. Decide which AI worker should handle this request.

Workers available:
- "claude": coding, debugging, refactoring, implementing, fixing bugs, writing functions
- "gpt": explaining concepts, summarizing, teaching, planning, answering "why/how/what" questions

User message: "${message}"

Reply ONLY with valid JSON, nothing else:
{"worker": "claude" or "gpt", "confidence": 0.5 or 0.7 or 0.9, "reasoning": "one sentence why"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return {
      worker: parsed.worker as WorkerType,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch {
    // ถ้า smart router fail → fallback ไป keyword router
    console.log("[SMART ROUTER FAILED] falling back to keyword router");
    return classifyTask(message);
  }
}
