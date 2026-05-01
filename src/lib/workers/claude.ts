import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function callClaude(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model: string = "claude-sonnet-4-5"
): Promise<{ content: string; tokens: number; model: string }> {
  const client = getClient();

  const messages = [...history, { role: "user" as const, content: message }];

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages,
  });

  const firstContent = response.content[0];
  const content = firstContent?.type === "text" ? firstContent.text : "";
  if (!content) {
    throw new Error(`Anthropic returned an empty response for model: ${model}`);
  }

  const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
  return { content, tokens, model };
}
