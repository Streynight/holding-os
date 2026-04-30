import { db } from "./db/client";
import { conversations, messages } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// ============ CONVERSATIONS ============

export async function createConversation(userId: string) {
  const id = randomUUID();
  const [conv] = await db
    .insert(conversations)
    .values({ id, userId, title: "New Conversation" })
    .returning();
  return conv;
}

export async function getConversation(id: string) {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: { messages: { orderBy: messages.createdAt } },
  });
  return conv || null;
}

export async function updateConversationTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function getUserConversations(userId: string) {
  return db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: [desc(conversations.updatedAt)],
    limit: 30,
  });
}

export async function deleteConversation(id: string) {
  await db.delete(conversations).where(eq(conversations.id, id));
}

// ============ MESSAGES ============

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  worker?: string,
  model?: string,
  tokens?: number
) {
  const [msg] = await db
    .insert(messages)
    .values({
      id: randomUUID(),
      conversationId,
      role,
      content,
      worker,
      model,
      tokens: tokens || 0,
    })
    .returning();

  // อัปเดต updatedAt ของ conversation
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return msg;
}

export async function getConversationMessages(conversationId: string) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
  });
}

// ============ HELPER FOR AI ============

export function getHistoryForAI(
  msgs: Array<{ role: string; content: string }>
): Array<{ role: "user" | "assistant"; content: string }> {
  return msgs.slice(-10).map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}
