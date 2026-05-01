import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callGPT(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model: string = "gpt-5.4-mini"
): Promise<{ content: string; tokens: number; model: string }> {
  const safeMessage = Buffer.from(message, "utf-8").toString("utf-8");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: Buffer.from(m.content, "utf-8").toString("utf-8"),
    })),
    { role: "user" as const, content: safeMessage },
  ];

  const isGPT5 = model.startsWith("gpt-5");
  const tokenParam = isGPT5
    ? { max_completion_tokens: 2000 }
    : { max_tokens: 2000 };

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    ...tokenParam,
  });

  const content = response.choices[0]?.message?.content ?? "";
  if (!content) {
    throw new Error(`OpenAI returned an empty response for model: ${model}`);
  }

  const tokens = response.usage?.total_tokens ?? 0;
  return { content, tokens, model };
}
