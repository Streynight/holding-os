import { RouterDecision, WorkerType } from "./types";

export function classifyTask(message: string): RouterDecision {
  const lower = message.toLowerCase();

  let scores: Record<WorkerType, number> = {
    claude: 0,
    gpt: 0,
  };

  const claudeKeywords = ["code", "debug", "refactor", "fix", "implement", "bug", "error", "function", "โค้ด", "แก้บัค"];
  claudeKeywords.forEach(kw => { if (lower.includes(kw)) scores.claude += 2; });

  const gptKeywords = ["explain", "why", "how", "teach", "summarize", "plan", "what is", "อธิบาย", "สอน", "สรุป", "ทำไม", "ยังไง", "คืออะไร"];
  gptKeywords.forEach(kw => { if (lower.includes(kw)) scores.gpt += 2; });

  let winner: WorkerType = "claude";
  let maxScore = 0;

  Object.entries(scores).forEach(([worker, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winner = worker as WorkerType;
    }
  });

  const confidence = maxScore === 0 ? 0.5 : maxScore >= 4 ? 0.9 : 0.7;

  return {
    worker: winner,
    confidence,
    reasoning: `Matched keywords for ${winner} (score: ${maxScore})`,
  };
}
