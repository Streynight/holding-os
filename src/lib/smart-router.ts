import Anthropic from "@anthropic-ai/sdk";
import { RouterDecision, WorkerType } from "./types";
import { classifyTask } from "./router";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function smartClassifyTask(
  message: string
): Promise<RouterDecision> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `You are a task router. Analyze this message and decide the best AI worker and model.

Available options:
- worker "claude", model "claude-sonnet-4-5": for coding, debugging, implementing, fixing bugs
- worker "gpt", model "gpt-5.5": for complex explanations, analysis, planning, summarizing
- worker "gpt", model "gpt-5.4-mini": for simple chat, greetings, quick questions, casual conversation

User message: "${message}"

Reply ONLY with valid JSON:
{"worker": "claude" or "gpt", "model": "claude-sonnet-4-5" or "gpt-5.5" or "gpt-5.4-mini", "confidence": 0.5-0.9, "reasoning": "one sentence"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return {
      worker: parsed.worker as WorkerType,
      model: parsed.model,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch {
    console.log("[SMART ROUTER FAILED] falling back to keyword router");
    return classifyTask(message);
  }
}
