"use client";

import { RedirectToSignIn, UserButton, useAuth } from "@clerk/nextjs";
import { useState, useRef, useEffect, useCallback } from "react";

interface PlanStep {
  stepId: number;
  worker: string;
  model: string;
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  worker?: string;
  model?: string;
  confidence?: number;
  latency?: number;
  routerType?: string;
  reasoning?: string;
  strategy?: string;
  planSteps?: PlanStep[];
  rating?: number;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

type Language = "en" | "th";

const MODEL_COLORS: Record<string, string> = {
  "gpt-5.5": "text-green-400",
  "gpt-5.4-mini": "text-emerald-300",
  "claude-sonnet-4-5": "text-purple-400",
};

const MODEL_BADGES: Record<string, string> = {
  "gpt-5.5": "GPT-5.5",
  "gpt-5.4-mini": "GPT-mini",
  "claude-sonnet-4-5": "Claude",
};

const UI_COPY: Record<
  Language,
  {
    newChat: string;
    noConversations: string;
    phase: string;
    subtitle: string;
    closeSidebar: string;
    toggleSidebar: string;
    swarm: string;
    agent: string;
    smart: string;
    language: string;
    claudeLegend: string;
    gptLegend: string;
    miniLegend: string;
    keywordMode: string;
    smartMode: string;
    agentMode: string;
    loadingHistory: string;
    emptyTitle: string;
    keywordExample: string;
    agentExample: string;
    swarmExample: string;
    rate: string;
    swarmLoading: string;
    agentLoading: string;
    thinking: string;
    swarmPlaceholder: string;
    agentPlaceholder: string;
    defaultPlaceholder: string;
    send: string;
    failedToConnect: string;
    strategies: Record<string, string>;
  }
> = {
  en: {
    newChat: "+ New Chat",
    noConversations: "No conversations yet",
    phase: "Phase 6 - Learning + Swarms",
    subtitle: "Phase 6 - Learning Router + Multi-Agent Swarms",
    closeSidebar: "Close sidebar",
    toggleSidebar: "Toggle sidebar",
    swarm: "Swarm",
    agent: "Agent",
    smart: "Smart",
    language: "Language",
    claudeLegend: "Claude - coding",
    gptLegend: "GPT-5.5 - complex",
    miniLegend: "GPT-mini - simple",
    keywordMode: "Keyword",
    smartMode: "Smart",
    agentMode: "Agent",
    loadingHistory: "Loading...",
    emptyTitle: "Holding OS - Phase 6",
    keywordExample: 'Keyword: "hello" -> GPT-mini',
    agentExample: 'Agent: "build a website" -> plan -> execute',
    swarmExample: "Swarm: GPT + Claude + Reviewer vote on an answer",
    rate: "Rate:",
    swarmLoading: "Swarm is voting...",
    agentLoading: "Planning...",
    thinking: "Thinking...",
    swarmPlaceholder: "Describe a big task for the Swarm to decide...",
    agentPlaceholder: "Describe what you want. Agent will plan it...",
    defaultPlaceholder: "Type your message here...",
    send: "Send",
    failedToConnect: "Failed to connect",
    strategies: {
      single: "⚡ Single",
      multi: "🔗 Multi-step",
      collaborate: "🤝 Collaborate",
      swarm: "♾️ Swarm",
    },
  },
  th: {
    newChat: "+ แชทใหม่",
    noConversations: "ยังไม่มี conversation",
    phase: "Phase 6 - Learning + Swarms",
    subtitle: "Phase 6 - Learning Router + Multi-Agent Swarms",
    closeSidebar: "ปิดแถบข้าง",
    toggleSidebar: "เปิดหรือปิดแถบข้าง",
    swarm: "Swarm",
    agent: "Agent",
    smart: "Smart",
    language: "ภาษา",
    claudeLegend: "Claude - coding",
    gptLegend: "GPT-5.5 - complex",
    miniLegend: "GPT-mini - simple",
    keywordMode: "Keyword",
    smartMode: "Smart",
    agentMode: "Agent",
    loadingHistory: "กำลังโหลด...",
    emptyTitle: "Holding OS - Phase 6",
    keywordExample: 'Keyword: "สวัสดี" -> GPT-mini',
    agentExample: 'Agent: "สร้าง website" -> วางแผน -> ทำ',
    swarmExample: "Swarm: GPT + Claude + Reviewer โหวตคำตอบ",
    rate: "ให้คะแนน:",
    swarmLoading: "Swarm กำลังโหวต...",
    agentLoading: "กำลังวางแผน...",
    thinking: "กำลังคิด...",
    swarmPlaceholder: "บอก task ใหญ่ให้ Swarm ช่วยกันตัดสิน...",
    agentPlaceholder: "บอกสิ่งที่ต้องการ Agent จะวางแผนให้...",
    defaultPlaceholder: "พิมพ์ข้อความที่นี่...",
    send: "ส่ง",
    failedToConnect: "เชื่อมต่อไม่ได้",
    strategies: {
      single: "⚡ Single",
      multi: "🔗 Multi-step",
      collaborate: "🤝 Collaborate",
      swarm: "♾️ Swarm",
    },
  },
};

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useSmartRouter, setUseSmartRouter] = useState(false);
  const [useAgentPlanning, setUseAgentPlanning] = useState(false);
  const [useSwarmMode, setUseSwarmMode] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "th";
    const savedLanguage = window.localStorage.getItem("holding-os-language");
    return savedLanguage === "en" || savedLanguage === "th" ? savedLanguage : "th";
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const copy = UI_COPY[language];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("holding-os-language", language);
  }, [language]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConversations() {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (!cancelled) setConversations(data.conversations || []);
      } catch {}
    }

    void loadInitialConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadConversation(id: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setConversationId(id);
        setMessages(
          data.conversation.messages.map((m: { id: string; role: "user" | "assistant"; content: string; worker?: string; model?: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            worker: m.worker,
            model: m.model,
          }))
        );
      }
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
    fetchConversations();
  }

  async function handleRate(msg: Message, rating: number) {
    if (!conversationId) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        messageId: msg.id,
        rating,
        worker: msg.worker,
        model: msg.model,
      }),
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, rating } : m)));
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          useSmartRouter,
          useAgentPlanning,
          useSwarmMode,
        }),
      });

      const data = await res.json();

      if (data.error) {
        const detail = data.details ? `\n${data.details}` : "";
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `❌ ${data.error}${detail}` },
        ]);
      } else {
        if (!conversationId) {
          setConversationId(data.conversationId);
          setTimeout(fetchConversations, 2000);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.content,
            worker: data.metadata?.worker,
            model: data.metadata?.model,
            confidence: data.metadata?.confidence,
            latency: data.metadata?.latency_ms,
            routerType: data.metadata?.router_type,
            reasoning: data.metadata?.reasoning,
            strategy: data.metadata?.strategy,
            planSteps: data.metadata?.plan_steps,
          },
        ]);
        fetchConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `❌ ${copy.failedToConnect}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return <div className="flex h-dvh items-center justify-center bg-slate-900 text-white" />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="relative flex h-dvh min-h-0 overflow-hidden bg-slate-900 text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={copy.closeSidebar}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/60 md:hidden"
        />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[min(18rem,82vw)] flex-col border-r border-slate-700 bg-slate-800 md:relative md:z-auto md:w-64 md:shrink-0">
          <div className="p-3 border-b border-slate-700">
            <button
              onClick={() => { setConversationId(null); setMessages([]); }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
            >
              {copy.newChat}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-slate-500 text-xs text-center mt-4">{copy.noConversations}</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`group flex items-center gap-1 p-2 rounded cursor-pointer hover:bg-slate-700 ${conversationId === conv.id ? "bg-slate-700" : ""}`}
                >
                  <span className="flex-1 text-xs truncate text-slate-300">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="hidden group-hover:block text-slate-500 hover:text-red-400 text-xs px-1"
                  >✕</button>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
            {copy.phase}
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-700 bg-slate-800 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="shrink-0 rounded px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              aria-label={copy.toggleSidebar}
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">🤖 Holding OS</h1>
              <p className="truncate text-xs text-slate-400">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <UserButton />
            <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 p-0.5" aria-label={copy.language}>
              {(["en", "th"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  aria-pressed={language === lang}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    language === lang ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">♾️ {copy.swarm}</span>
              <div
                onClick={() => {
                  setUseSwarmMode((v) => !v);
                  setUseAgentPlanning(false);
                  setUseSmartRouter(false);
                }}
                className={`w-10 h-5 rounded-full transition-colors ${useSwarmMode ? "bg-rose-600" : "bg-slate-600"} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useSwarmMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">🧠 {copy.agent}</span>
              <div
                onClick={() => {
                  if (!useSwarmMode) setUseAgentPlanning((v) => !v);
                }}
                className={`w-10 h-5 rounded-full transition-colors ${useAgentPlanning && !useSwarmMode ? "bg-purple-600" : "bg-slate-600"} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useAgentPlanning && !useSwarmMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">{copy.smart}</span>
              <div
                onClick={() => { if (!useAgentPlanning && !useSwarmMode) setUseSmartRouter((v) => !v); }}
                className={`w-10 h-5 rounded-full transition-colors ${useSmartRouter && !useAgentPlanning && !useSwarmMode ? "bg-blue-600" : "bg-slate-600"} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useSmartRouter && !useAgentPlanning && !useSwarmMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:px-4">
          <span className="text-purple-400">● {copy.claudeLegend}</span>
          <span className="text-green-400">● {copy.gptLegend}</span>
          <span className="text-emerald-300">● {copy.miniLegend}</span>
          <span className="text-slate-400">
            | {useAgentPlanning ? `🧠 ${copy.agentMode}` : useSmartRouter ? `🔑 ${copy.smartMode}` : `⚡ ${copy.keywordMode}`}
          </span>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
          {loadingHistory ? (
            <div className="text-center text-slate-500 mt-20">{copy.loadingHistory}</div>
          ) : messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-lg space-y-3 px-2 text-center text-slate-500 sm:mt-16">
              <p className="text-lg">🤖 {copy.emptyTitle}</p>
              <div className="text-sm space-y-1">
                <p>⚡ {copy.keywordExample}</p>
                <p>🧠 {copy.agentExample}</p>
                <p>♾️ {copy.swarmExample}</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[min(42rem,100%)] overflow-hidden break-words rounded-lg p-3 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"}`}>

                  {msg.role === "assistant" && msg.model && (
                    <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-slate-600 text-xs">
                      <span className={`font-bold ${MODEL_COLORS[msg.model] || "text-slate-400"}`}>
                        {MODEL_BADGES[msg.model] || msg.model}
                      </span>
                      {msg.strategy && (
                        <span className="text-slate-400">{copy.strategies[msg.strategy] || msg.strategy}</span>
                      )}
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{msg.latency}ms</span>
                      {msg.planSteps && msg.planSteps.length > 1 && (
                        <button
                          onClick={() => setExpandedSteps(expandedSteps === msg.id ? null : msg.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {expandedSteps === msg.id ? "▼" : "▶"} {msg.planSteps.length} steps
                        </button>
                      )}
                    </div>
                  )}

                  {expandedSteps === msg.id && msg.planSteps && (
                    <div className="mb-3 space-y-2">
                      {msg.planSteps.map((step, si) => (
                        <div key={si} className="bg-slate-800 rounded p-2 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400">Step {step.stepId}</span>
                            <span className={MODEL_COLORS[step.model] || "text-slate-400"}>
                              {MODEL_BADGES[step.model] || step.model}
                            </span>
                          </div>
                          <p className="text-slate-300">{step.content.slice(0, 150)}...</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{msg.content}</div>

                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-600">
                      <span className="text-slate-500 text-xs">{copy.rate}</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(msg, star)}
                          className={`text-sm ${(msg.rating || 0) >= star ? "text-yellow-400" : "text-slate-600"} hover:text-yellow-400`}
                        >★</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 p-3 rounded-lg text-slate-400 text-sm animate-pulse">
                {useSwarmMode ? `♾️ ${copy.swarmLoading}` : useAgentPlanning ? `🧠 ${copy.agentLoading}` : copy.thinking}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-700 bg-slate-800 p-3 sm:p-4">
          {conversationId && (
            <p className="text-xs text-slate-600 mb-1">💾 {conversationId.slice(0, 8)}...</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={useSwarmMode ? copy.swarmPlaceholder : useAgentPlanning ? copy.agentPlaceholder : copy.defaultPlaceholder}
              className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full rounded bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 sm:w-auto"
            >
              {loading ? "..." : copy.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
