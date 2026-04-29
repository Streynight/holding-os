export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  worker?: string;
  timestamp: string;
}

export interface ConversationMemory {
  id: string;
  messages: ChatMessage[];
}

// In-memory store (Phase 2 ใช้ RAM, Phase 3 จะใช้ DB)
const store = new Map<string, ConversationMemory>();

export function getOrCreateConversation(id: string): ConversationMemory {
  if (!store.has(id)) {
    store.set(id, { id, messages: [] });
  }
  return store.get(id)!;
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  worker?: string
): void {
  const conv = getOrCreateConversation(conversationId);
  conv.messages.push({
    role,
    content,
    worker,
    timestamp: new Date().toISOString(),
  });
  // เก็บแค่ 20 ข้อความล่าสุด (ป้องกัน context overflow)
  if (conv.messages.length > 20) {
    conv.messages = conv.messages.slice(-20);
  }
}

export function getHistory(conversationId: string): ChatMessage[] {
  return getOrCreateConversation(conversationId).messages;
}

export function formatHistoryForAI(
  messages: ChatMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
