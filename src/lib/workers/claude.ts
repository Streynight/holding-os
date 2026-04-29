import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(message: string): Promise<{
  content: string;
  tokens: number;
}> {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  const tokens =
    (response.usage?.input_tokens || 0) +
    (response.usage?.output_tokens || 0);

  return { content, tokens };
}
