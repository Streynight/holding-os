import { callGPT } from "./workers/gpt";
import { callClaude } from "./workers/claude";
import { StepResult } from "./executor";

export interface SwarmResult {
  finalContent: string;
  steps: StepResult[];
  totalTokens: number;
  winner: string;
  reasoning: string;
}

export async function executeSwarm(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<SwarmResult> {
  const [strategy, implementation, review] = await Promise.all([
    callGPT(
      `You are Agent 1. Propose the best feature plan and success criteria for this task:\n${message}`,
      history,
      "gpt-5.5"
    ),
    callClaude(
      `You are Agent 2. Produce the strongest concrete answer or implementation for this task:\n${message}`,
      history,
      "claude-sonnet-4-5"
    ),
    callClaude(
      `You are Agent 3. Review risks, edge cases, and quality criteria for this task:\n${message}`,
      history,
      "claude-sonnet-4-5"
    ),
  ]);

  const steps: StepResult[] = [
    { stepId: 1, worker: "gpt", model: strategy.model, content: strategy.content, tokens: strategy.tokens },
    {
      stepId: 2,
      worker: "claude",
      model: implementation.model,
      content: implementation.content,
      tokens: implementation.tokens,
    },
    { stepId: 3, worker: "claude", model: review.model, content: review.content, tokens: review.tokens },
  ];

  const votePrompt = `You are the swarm coordinator. Choose the best final answer by combining these agents.

Original task:
${message}

Agent 1 - GPT planner:
${strategy.content}

Agent 2 - Claude builder:
${implementation.content}

Agent 3 - Claude reviewer:
${review.content}

Return JSON only:
{
  "winner": "agent-1|agent-2|agent-3|combined",
  "reasoning": "short reason",
  "final": "final answer to show the user"
}`;

  const vote = await callGPT(votePrompt, [], "gpt-5.5");
  let parsed: { winner?: string; reasoning?: string; final?: string } = {};

  try {
    parsed = JSON.parse(vote.content.replace(/```json|```/g, "").trim());
  } catch {
    parsed = {
      winner: "combined",
      reasoning: "Coordinator returned prose, using it as the final answer.",
      final: vote.content,
    };
  }

  return {
    finalContent: parsed.final || vote.content,
    steps,
    totalTokens: steps.reduce((sum, step) => sum + step.tokens, 0) + vote.tokens,
    winner: parsed.winner || "combined",
    reasoning: parsed.reasoning || "Swarm selected the strongest combined answer.",
  };
}
