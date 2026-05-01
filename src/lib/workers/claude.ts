import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model: string = "claude-sonnet-4-5"
): Promise<{ content: string; tokens: number; model: string }> {
  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages,
  });

  const first = response.content[0];
  const content = first?.type === "text" ? first.text : "";
  const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
  return { content, tokens, model };
}
