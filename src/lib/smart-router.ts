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
          content: `You are a task router. Choose the best AI for this message.

Options:
- worker "claude", model "claude-sonnet-4-5": coding, debugging, implementing
- worker "gpt", model "gpt-5.5": complex explanations, analysis, planning
- worker "gpt", model "gpt-5.4-mini": simple chat, greetings, short questions

Message: "${message}"

Respond with JSON only, no markdown:
{"worker": "gpt", "model": "gpt-5.4-mini", "confidence": 0.8, "reasoning": "simple greeting"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      worker: parsed.worker as WorkerType,
      model: parsed.model,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch (e) {
    console.log("[SMART ROUTER FAILED]", e);
    return classifyTask(message);
  }
}
