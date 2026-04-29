"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  worker?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            worker: data.metadata?.worker,
          },
        ]);
        console.log("[METADATA]", data.metadata);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <div className="bg-slate-800 p-4 border-b border-slate-700">
        <h1 className="text-white text-xl font-bold">🤖 Holding OS</h1>
        <p className="text-slate-400 text-sm">
          AI Orchestrator - GPT + Claude
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-20">
            <p>เริ่มต้นด้วยการพิมพ์อะไรก็ได้</p>
            <p className="text-sm mt-2">
              ลอง: "อธิบาย neural network" หรือ "เขียนโค้ด Python"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-2xl p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-100"
              }`}
            >
              {msg.worker && (
                <div className="text-xs text-slate-400 mb-1">
                  via {msg.worker.toUpperCase()}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-100 p-3 rounded-lg">
              กำลังคิด...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="พิมพ์ข้อความที่นี่..."
            className="flex-1 p-3 bg-slate-800 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "..." : "ส่ง"}
          </button>
        </div>
      </div>
    </div>
  );
}
