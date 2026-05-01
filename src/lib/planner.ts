import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export interface Plan {
  steps: Step[];
  strategy: "single" | "multi" | "collaborate";
  reasoning: string;
}

export interface Step {
  id: number;
  task: string;
  worker: "gpt" | "claude";
  model: string;
  dependsOn?: number[];
}

export async function createPlan(message: string): Promise<Plan> {
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are an AI task planner. Analyze this request and create an execution plan.

Workers available:
- "claude" (model: "claude-sonnet-4-5"): coding, debugging, technical implementation
- "gpt" (model: "gpt-5.5"): explaining, planning, analysis, complex reasoning
- "gpt" (model: "gpt-5.4-mini"): simple responses, summaries, quick answers

Strategies:
- "single": one worker handles everything (simple tasks)
- "multi": multiple workers handle different parts sequentially
- "collaborate": workers build on each other's output

Request: ${JSON.stringify(message)}

Reply ONLY with JSON:
{
  "strategy": "single",
  "reasoning": "why this strategy",
  "steps": [
    {"id": 1, "task": "what to do", "worker": "gpt", "model": "gpt-5.4-mini"}
  ]
}`,
        },
      ],
    });

    const firstContent = response.content[0];
    const text = firstContent?.type === "text" ? firstContent.text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as Plan;
  } catch (e) {
    console.log("[PLANNER FAILED] using simple plan", e);
    return {
      strategy: "single",
      reasoning: "Fallback to simple single-worker plan",
      steps: [{ id: 1, task: message, worker: "claude", model: "claude-sonnet-4-5" }],
    };
  }
}
