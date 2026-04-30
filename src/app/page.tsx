"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  worker?: string;
  model?: string;
  confidence?: number;
  latency?: number;
  routerType?: string;
  reasoning?: string;
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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useSmartRouter, setUseSmartRouter] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId, useSmartRouter }),
      });

      const data = await response.json();

      if (data.error) {
        const detail = data.details ? `\n${data.details}` : "";
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${data.error}${detail}` }]);
      } else {
        if (!conversationId) setConversationId(data.conversationId);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            worker: data.metadata?.worker,
            model: data.metadata?.model,
            confidence: data.metadata?.confidence,
            latency: data.metadata?.latency_ms,
            routerType: data.metadata?.router_type,
            reasoning: data.metadata?.reasoning,
          },
        ]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Failed to connect" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-bold">🤖 Holding OS</h1>
          <p className="text-slate-400 text-xs">Smart Model Routing — Claude + GPT-5.5 + GPT-mini</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-slate-400 text-xs">Smart Router</span>
            <div
              onClick={() => setUseSmartRouter(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors ${useSmartRouter ? "bg-blue-600" : "bg-slate-600"} relative cursor-pointer`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useSmartRouter ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </label>
          <button
            onClick={() => { setMessages([]); setConversationId(null); }}
            className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex gap-4 text-xs">
        <span className="text-purple-400">● Claude — coding/debug</span>
        <span className="text-green-400">● GPT-5.5 — complex/explain</span>
        <span className="text-emerald-300">● GPT-mini — simple chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-16 space-y-3">
            <p className="text-lg">ทดสอบ Smart Model Routing</p>
            <div className="text-sm space-y-1">
              <p>💬 "สวัสดี" → <span className="text-emerald-300">GPT-mini</span></p>
              <p>📖 "อธิบาย machine learning" → <span className="text-green-400">GPT-5.5</span></p>
              <p>💻 "เขียนโค้ด Python sort array" → <span className="text-purple-400">Claude</span></p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white p-3" : "bg-slate-700 text-slate-100 p-3"}`}>
              {msg.role === "assistant" && msg.model && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                  <span className={`font-bold text-xs ${MODEL_COLORS[msg.model] || "text-slate-400"}`}>
                    {MODEL_BADGES[msg.model] || msg.model}
                  </span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-slate-400 text-xs">{msg.routerType === "smart" ? "🧠 smart" : "🔑 keyword"}</span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-slate-400 text-xs">{msg.latency}ms</span>
                  {msg.reasoning && (
                    <span className="text-slate-500 text-xs truncate max-w-xs" title={msg.reasoning}>
                      — {msg.reasoning}
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 p-3 rounded-lg text-slate-400 text-sm animate-pulse">กำลังคิด...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="พิมพ์ข้อความที่นี่..."
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
  );
}
