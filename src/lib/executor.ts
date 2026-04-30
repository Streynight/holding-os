import { callGPT } from "./workers/gpt";
import { callClaude } from "./workers/claude";
import { Plan, Step } from "./planner";

export interface StepResult {
  stepId: number;
  worker: string;
  model: string;
  content: string;
  tokens: number;
}

export interface ExecutionResult {
  finalContent: string;
  steps: StepResult[];
  totalTokens: number;
  strategy: string;
}

export async function executePlan(
  plan: Plan,
  originalMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  let totalTokens = 0;

  if (plan.strategy === "single") {
    const step = plan.steps[0];
    const response = await callWorker(step, originalMessage, history);
    results.push({ stepId: step.id, ...response });
    totalTokens += response.tokens;
    return { finalContent: response.content, steps: results, totalTokens, strategy: plan.strategy };
  }

  if (plan.strategy === "multi") {
    for (const step of plan.steps) {
      const prompt =
        step.id === 1
          ? originalMessage
          : `Original request: ${originalMessage}\n\nPrevious step result:\n${results[results.length - 1]?.content}\n\nYour task: ${step.task}`;
      const response = await callWorker(step, prompt, history);
      results.push({ stepId: step.id, ...response });
      totalTokens += response.tokens;
    }
    return {
      finalContent: results[results.length - 1]?.content || "",
      steps: results,
      totalTokens,
      strategy: plan.strategy,
    };
  }

  if (plan.strategy === "collaborate") {
    const firstStep = plan.steps[0];
    const firstResponse = await callWorker(firstStep, originalMessage, history);
    results.push({ stepId: firstStep.id, ...firstResponse });
    totalTokens += firstResponse.tokens;

    for (let i = 1; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const prompt = `Original request: ${originalMessage}

Previous analysis/work:
${results.map((r) => `[${r.worker.toUpperCase()}]: ${r.content}`).join("\n\n")}

Your task: ${step.task}
Build upon and improve the previous work. Be concise and add value.`;

      const response = await callWorker(step, prompt, []);
      results.push({ stepId: step.id, ...response });
      totalTokens += response.tokens;
    }

    if (results.length > 1) {
      const summaryPrompt = `Combine these outputs into one coherent, well-structured response:

${results.map((r) => `[${r.worker.toUpperCase()}]:\n${r.content}`).join("\n\n---\n\n")}

Create a unified response that incorporates the best of each contribution.`;

      const summaryResponse = await callGPT(summaryPrompt, [], "gpt-5.5");
      totalTokens += summaryResponse.tokens;
      return {
        finalContent: summaryResponse.content,
        steps: results,
        totalTokens,
        strategy: plan.strategy,
      };
    }

    return {
      finalContent: results[results.length - 1]?.content || "",
      steps: results,
      totalTokens,
      strategy: plan.strategy,
    };
  }

  return { finalContent: "Unable to execute plan", steps: results, totalTokens: 0, strategy: plan.strategy };
}

async function callWorker(
  step: Step,
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ worker: string; model: string; content: string; tokens: number }> {
  if (step.worker === "gpt") {
    const r = await callGPT(message, history, step.model);
    return { worker: "gpt", model: step.model, content: r.content, tokens: r.tokens };
  }
  const r = await callClaude(message, history, step.model);
  return { worker: "claude", model: step.model, content: r.content, tokens: r.tokens };
}
