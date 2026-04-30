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

const STRATEGY_BADGES: Record<string, string> = {
  single: "⚡ Single",
  multi: "🔗 Multi-step",
  collaborate: "🤝 Collaborate",
};

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useSmartRouter, setUseSmartRouter] = useState(false);
  const [useAgentPlanning, setUseAgentPlanning] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        { id: crypto.randomUUID(), role: "assistant", content: "❌ Failed to connect" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white" />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-3 border-b border-slate-700">
            <button
              onClick={() => { setConversationId(null); setMessages([]); }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
            >
              + New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-slate-500 text-xs text-center mt-4">ยังไม่มี conversation</p>
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
            Phase 5 — Auth + Monitoring
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((v) => !v)} className="text-slate-400 hover:text-white">☰</button>
            <div>
              <h1 className="text-white text-lg font-bold">🤖 Holding OS</h1>
              <p className="text-slate-400 text-xs">Phase 5 — Production Auth + Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">🧠 Agent</span>
              <div
                onClick={() => setUseAgentPlanning((v) => !v)}
                className={`w-10 h-5 rounded-full transition-colors ${useAgentPlanning ? "bg-purple-600" : "bg-slate-600"} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useAgentPlanning ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">Smart</span>
              <div
                onClick={() => { if (!useAgentPlanning) setUseSmartRouter((v) => !v); }}
                className={`w-10 h-5 rounded-full transition-colors ${useSmartRouter && !useAgentPlanning ? "bg-blue-600" : "bg-slate-600"} relative cursor-pointer`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useSmartRouter && !useAgentPlanning ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-800 px-4 py-1.5 border-b border-slate-700 flex gap-4 text-xs">
          <span className="text-purple-400">● Claude — coding</span>
          <span className="text-green-400">● GPT-5.5 — complex</span>
          <span className="text-emerald-300">● GPT-mini — simple</span>
          <span className="text-slate-400">
            | {useAgentPlanning ? "🧠 Agent" : useSmartRouter ? "🔑 Smart" : "⚡ Keyword"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingHistory ? (
            <div className="text-center text-slate-500 mt-20">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-16 space-y-3">
              <p className="text-lg">🤖 Holding OS — Phase 5</p>
              <div className="text-sm space-y-1">
                <p>⚡ Keyword: &quot;สวัสดี&quot; → <span className="text-emerald-300">GPT-mini</span></p>
                <p>🧠 Agent: &quot;สร้าง website&quot; → <span className="text-purple-400">วางแผน → ทำ</span></p>
                <p>🤝 Collaborate: GPT + Claude ช่วยกัน</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-2xl rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white p-3" : "bg-slate-700 text-slate-100 p-3"}`}>

                  {msg.role === "assistant" && msg.model && (
                    <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-slate-600 text-xs">
                      <span className={`font-bold ${MODEL_COLORS[msg.model] || "text-slate-400"}`}>
                        {MODEL_BADGES[msg.model] || msg.model}
                      </span>
                      {msg.strategy && (
                        <span className="text-slate-400">{STRATEGY_BADGES[msg.strategy] || msg.strategy}</span>
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

                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>

                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-600">
                      <span className="text-slate-500 text-xs">Rate:</span>
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
                {useAgentPlanning ? "🧠 กำลังวางแผน..." : "กำลังคิด..."}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          {conversationId && (
            <p className="text-xs text-slate-600 mb-1">💾 {conversationId.slice(0, 8)}...</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={useAgentPlanning ? "บอกสิ่งที่ต้องการ Agent จะวางแผนให้..." : "พิมพ์ข้อความที่นี่..."}
              className="flex-1 p-3 bg-slate-900 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-5 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 font-medium text-sm"
            >
              {loading ? "..." : "ส่ง"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
