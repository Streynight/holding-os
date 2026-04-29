import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// models ที่ใช้ max_completion_tokens
const NEW_API_MODELS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"];

export async function callGPT(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model: string = "gpt-5.4-mini"
): Promise<{ content: string; tokens: number; model: string }> {
  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const isNewModel = NEW_API_MODELS.some(m => model.startsWith(m));

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    ...(isNewModel
      ? { max_completion_tokens: 2000 }
      : { max_tokens: 2000 }),
  });

  const content = response.choices[0].message.content || "";
  const tokens = response.usage?.total_tokens || 0;
  return { content, tokens, model };
}
