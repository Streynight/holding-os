import { RouterDecision } from "./types";

export function classifyTask(message: string): RouterDecision {
  const lower = message.toLowerCase();
  const wordCount = message.trim().split(/\s+/).length;

  const claudeKeywords = [
    "code", "debug", "refactor", "fix", "implement",
    "bug", "error", "function", "class", "api", "algorithm",
    "โค้ด", "แก้บัค", "เขียนโค้ด", "โปรแกรม", "script"
  ];
  const isClaudeTask = claudeKeywords.some(kw => lower.includes(kw));

  if (isClaudeTask) {
    return {
      worker: "claude",
      model: "claude-sonnet-4-5",
      confidence: 0.9,
      reasoning: "Code/debug task → Claude Sonnet 4.5",
    };
  }

  const complexKeywords = [
    "explain", "analyze", "compare", "design", "architecture",
    "strategy", "why", "how does", "difference between",
    "อธิบาย", "วิเคราะห์", "เปรียบเทียบ", "ออกแบบ",
    "ทำไม", "แตกต่าง", "ช่วยวางแผน", "summarize", "สรุป"
  ];
  const isComplexTask = complexKeywords.some(kw => lower.includes(kw));

  if (isComplexTask || wordCount > 20) {
    return {
      worker: "gpt",
      model: "gpt-5.5",
      confidence: 0.8,
      reasoning: `Complex/explain task (${wordCount} words) → GPT-5.5`,
    };
  }

  return {
    worker: "gpt",
    model: "gpt-5.4-mini",
    confidence: 0.6,
    reasoning: `Simple/short message (${wordCount} words) → GPT-5.4-mini`,
  };
}
