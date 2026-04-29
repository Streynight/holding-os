"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  worker?: string;
  confidence?: number;
  latency?: number;
  routerType?: string;
}

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
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          useSmartRouter,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `❌ Error: ${data.error}` },
        ]);
      } else {
        if (!conversationId) setConversationId(data.conversationId);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            worker: data.metadata?.worker,
            confidence: data.metadata?.confidence,
            latency: data.metadata?.latency_ms,
            routerType: data.metadata?.router_type,
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Failed to connect to API" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setConversationId(null);
  }

  const workerColor = (worker?: string) =>
    worker === "gpt" ? "text-green-400" : "text-purple-400";

  const confidenceBadge = (c?: number) => {
    if (!c) return "";
    if (c >= 0.9) return "🟢";
    if (c >= 0.7) return "🟡";
    return "🔴";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-bold">🤖 Holding OS</h1>
          <p className="text-slate-400 text-xs">Phase 2 — GPT + Claude + Memory</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Smart Router Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-slate-400 text-xs">Smart Router</span>
            <div
              onClick={() => setUseSmartRouter(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors ${
                useSmartRouter ? "bg-blue-600" : "bg-slate-600"
              } relative cursor-pointer`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  useSmartRouter ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-20 space-y-2">
            <p className="text-lg">เริ่มต้นการสนทนา</p>
            <p className="text-sm">ลอง: "อธิบาย neural network"</p>
            <p className="text-sm">หรือ: "เขียนโค้ด Python หา prime numbers"</p>
            <p className="text-xs text-slate-600 mt-4">
              {useSmartRouter
                ? "🧠 Smart Router: Claude คิดว่า AI ไหนเหมาะ"
                : "🔑 Keyword Router: ใช้คำสำคัญตัดสินใจ"}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white p-3"
                  : "bg-slate-700 text-slate-100 p-3"
              }`}
            >
              {/* Metadata bar */}
              {msg.role === "assistant" && msg.worker && (
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <span className={`font-semibold ${workerColor(msg.worker)}`}>
                    {msg.worker.toUpperCase()}
                  </span>
                  <span>{confidenceBadge(msg.confidence)}</span>
                  <span>{msg.routerType === "smart" ? "🧠" : "🔑"}</span>
                  {msg.latency && <span>{msg.latency}ms</span>}
                </div>
              )}

              {/* Content */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 p-3 rounded-lg text-slate-400 text-sm animate-pulse">
              กำลังคิด...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        {conversationId && (
          <p className="text-xs text-slate-600 mb-2">
            Session: {conversationId.slice(0, 8)}...
          </p>
        )}
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
