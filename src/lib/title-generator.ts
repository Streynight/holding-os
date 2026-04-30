import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const safe = Buffer.from(firstMessage, "utf-8").toString("utf-8");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Generate a short title (max 5 words) for a conversation that starts with this message. Reply with ONLY the title, no quotes, no explanation.

Message: ${JSON.stringify(safe)}`,
        },
      ],
    });

    const title =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "New Conversation";

    return title.slice(0, 50);
  } catch {
    const words = firstMessage.trim().split(/\s+/).slice(0, 4).join(" ");
    return words || "New Conversation";
  }
}
