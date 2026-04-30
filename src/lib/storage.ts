import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  worker?: string;
  model?: string;
  tokens: number;
  createdAt: string;
}

export async function createConversation(userId: string): Promise<Conversation> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const conv: Conversation = { id, userId, title: "New Conversation", createdAt: now, updatedAt: now };
  await getRedis().set(`conv:${id}`, conv);
  await getRedis().zadd(`user:${userId}:convs`, { score: Date.now(), member: id });
  return conv;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return getRedis().get<Conversation>(`conv:${id}`);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const conv = await getConversation(id);
  if (!conv) return;
  await getRedis().set(`conv:${id}`, { ...conv, title, updatedAt: new Date().toISOString() });
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const ids = await getRedis().zrange<string[]>(`user:${userId}:convs`, 0, 29, { rev: true });
  if (!ids.length) return [];
  const convs = await Promise.all(ids.map((id) => getRedis().get<Conversation>(`conv:${id}`)));
  return convs.filter(Boolean) as Conversation[];
}

export async function deleteConversation(id: string): Promise<void> {
  const conv = await getConversation(id);
  if (conv) await getRedis().zrem(`user:${conv.userId}:convs`, id);
  await Promise.all([getRedis().del(`conv:${id}`), getRedis().del(`conv:${id}:msgs`)]);
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  worker?: string,
  model?: string,
  tokens?: number
): Promise<StoredMessage> {
  const msg: StoredMessage = {
    id: randomUUID(),
    conversationId,
    role,
    content,
    worker,
    model,
    tokens: tokens ?? 0,
    createdAt: new Date().toISOString(),
  };
  await getRedis().rpush(`conv:${conversationId}:msgs`, msg);
  const conv = await getConversation(conversationId);
  if (conv) {
    await getRedis().set(`conv:${conversationId}`, { ...conv, updatedAt: new Date().toISOString() });
    await getRedis().zadd(`user:${conv.userId}:convs`, { score: Date.now(), member: conversationId });
  }
  return msg;
}

export async function getConversationMessages(conversationId: string): Promise<StoredMessage[]> {
  return getRedis().lrange<StoredMessage>(`conv:${conversationId}:msgs`, 0, -1);
}

export function getHistoryForAI(
  msgs: Array<{ role: string; content: string }>
): Array<{ role: "user" | "assistant"; content: string }> {
  return msgs.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}
