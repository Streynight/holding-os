import { RouterDecision, WorkerType } from "./types";

export function classifyTask(message: string): RouterDecision {
  const lower = message.toLowerCase();

  let scores: Record<WorkerType, number> = {
    claude: 0,
    gpt: 0,
  };

  // Claude keywords (โค้ด, debug)
  const claudeKeywords = [
    "code", "debug", "refactor", "fix", "implement",
    "bug", "error", "function", "class", "api",
    "โค้ด", "แก้บัค", "เขียนโค้ด", "โปรแกรม"
  ];
  claudeKeywords.forEach(kw => {
    if (lower.includes(kw)) scores.claude += 2;
  });

  // GPT keywords (อธิบาย, สนทนา, ถาม)
  const gptKeywords = [
    "explain", "why", "how", "teach", "summarize",
    "plan", "what", "who", "where", "when", "hello",
    "hi", "help", "tell me", "what is", "can you",
    "อธิบาย", "สอน", "สรุป", "ทำไม", "ยังไง",
    "คืออะไร", "ช่วย", "บอก", "สวัสดี", "หวัดดี",
    "ผม", "ฉัน", "คุณ"
  ];
  gptKeywords.forEach(kw => {
    if (lower.includes(kw)) scores.gpt += 2;
  });

  // หา winner
  let winner: WorkerType = "gpt"; // ← เปลี่ยน default เป็น GPT
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
