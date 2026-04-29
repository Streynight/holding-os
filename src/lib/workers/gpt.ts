import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callGPT(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model: string = "gpt-5.4-mini"
): Promise<{ content: string; tokens: number; model: string }> {
  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || "";
  const tokens = response.usage?.total_tokens || 0;
  return { content, tokens, model };
}
