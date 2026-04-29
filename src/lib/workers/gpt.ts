import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callGPT(message: string): Promise<{ content: string; tokens: number }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || "";
  const tokens = response.usage?.total_tokens || 0;
  return { content, tokens };
}
