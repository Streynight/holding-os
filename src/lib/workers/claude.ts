import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{ content: string; tokens: number }> {
  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages,
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";
  const tokens =
    (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
  return { content, tokens };
}
