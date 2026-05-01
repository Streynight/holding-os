"use client";

import { RedirectToSignIn, UserButton, useAuth } from "@clerk/nextjs";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  LEVELS,
  ACHIEVEMENTS,
  getLevelFromXP,
  getLevelProgress,
  type Achievement,
  type GamificationState,
} from "@/lib/gamification";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Mode = "keyword" | "smart" | "agent" | "swarm";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: Array<{
  id: Mode;
  label: string;
  icon: string;
  desc: string;
  color: string;
  xp: number;
}> = [
  { id: "keyword", label: "Keyword",       icon: "⚡", desc: "Fast rule-based dispatch",        color: "var(--blue)",    xp: 10 },
  { id: "smart",   label: "Smart Router",  icon: "🔑", desc: "AI-powered intelligent routing",  color: "var(--purple)",  xp: 15 },
  { id: "agent",   label: "Agent Planning",icon: "🧠", desc: "Multi-step strategic execution",  color: "var(--emerald)", xp: 25 },
  { id: "swarm",   label: "Swarm",         icon: "♾️", desc: "Multi-agent vote & consensus",    color: "var(--amber)",   xp: 40 },
];

const MODEL_META: Record<string, { label: string; color: string; glow: string }> = {
  "gpt-5.5":            { label: "GPT-5.5",  color: "var(--emerald)", glow: "var(--emerald-glow)" },
  "gpt-5.4-mini":       { label: "GPT-mini", color: "var(--cyan)",    glow: "var(--cyan-glow)"    },
  "claude-sonnet-4-5":  { label: "Claude",   color: "var(--purple)",  glow: "var(--purple-glow)"  },
};

const STRATEGY_BADGES: Record<string, string> = {
  single:     "⚡ Single",
  multi:      "🔗 Multi-step",
  collaborate:"🤝 Collaborate",
  swarm:      "♾️ Swarm",
};

const LOADING_LABELS: Record<Mode, string> = {
  keyword: "Routing your request…",
  smart:   "Classifying with AI…",
  agent:   "Planning mission…",
  swarm:   "Dispatching swarm agents…",
};

const EMPTY_EXAMPLES = [
  { mode: "keyword", text: "Explain how async/await works" },
  { mode: "smart",   text: "Write a Python web scraper for me" },
  { mode: "agent",   text: "Build a full REST API for a blog" },
  { mode: "swarm",   text: "Design a scalable microservices architecture" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function levelColor(level: number): string {
  return LEVELS.find((l) => l.level === level)?.color ?? "#94a3b8";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentDots({ count = 3 }: { count?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--blue)",
            display: "inline-block",
            animation: `agent-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function XPBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "var(--border-subtle)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        className="xp-bar-fill"
        style={{
          height: "100%",
          borderRadius: 2,
          background: color,
          width: `${progress}%`,
          boxShadow: `0 0 6px ${color}`,
          transition: "width 0.7s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

function AchievementToast({ achievement, onDone }: { achievement: Achievement; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="animate-achievement-in"
      style={{
        position: "fixed",
        bottom: 80,
        right: 24,
        zIndex: 999,
        background: "var(--bg-card)",
        border: "1px solid var(--amber)",
        borderRadius: 14,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: `0 0 24px var(--amber-glow), 0 4px 32px rgba(0,0,0,0.5)`,
        maxWidth: 320,
      }}
    >
      <span style={{ fontSize: 28 }}>{achievement.icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Achievement Unlocked
        </div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>
          {achievement.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>
          {achievement.description}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("keyword");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<string | null>(null);

  // Gamification
  const [gami, setGami] = useState<GamificationState | null>(null);
  const [xpGain, setXpGain] = useState<{ amount: number; id: number } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  const fetchGami = useCallback(async () => {
    try {
      const res = await fetch("/api/gamification");
      const data = await res.json();
      if (data.state) setGami(data.state);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchGami();
  }, [fetchConversations, fetchGami]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Gamification helpers ───────────────────────────────────────────────────

  async function awardXP(action: "message" | "feedback", opts?: { mode?: string; rating?: number }) {
    try {
      const res = await fetch("/api/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...opts }),
      });
      const data = await res.json();
      if (data.state) setGami(data.state);
      if (data.xpGained > 0) {
        setXpGain({ amount: data.xpGained, id: Date.now() });
        setTimeout(() => setXpGain(null), 1800);
      }
      if (data.newAchievements?.length) {
        const toShow = data.newAchievements
          .map((id: string) => ACHIEVEMENTS.find((a) => a.id === id))
          .filter(Boolean) as Achievement[];
        setPendingAchievements((prev) => [...prev, ...toShow]);
      }
    } catch {}
  }

  // ── Conversation actions ───────────────────────────────────────────────────

  async function loadConversation(id: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setConversationId(id);
        setMessages(
          data.conversation.messages.map((m: {
            id: string; role: "user" | "assistant"; content: string;
            worker?: string; model?: string;
          }) => ({ id: m.id, role: m.role, content: m.content, worker: m.worker, model: m.model }))
        );
      }
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (conversationId === id) { setConversationId(null); setMessages([]); }
    fetchConversations();
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setExpandedSteps(null);
    inputRef.current?.focus();
  }

  // ── Rating ─────────────────────────────────────────────────────────────────

  async function handleRate(msg: Message, rating: number) {
    if (!conversationId) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId: msg.id, rating, worker: msg.worker, model: msg.model }),
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, rating } : m)));
    await awardXP("feedback", { rating });
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/holding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          useSmartRouter:    mode === "smart",
          useAgentPlanning:  mode === "agent",
          useSwarmMode:      mode === "swarm",
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `Error: ${data.error}${data.details ? `\n${data.details}` : ""}` },
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
            content:    data.content,
            worker:     data.metadata?.worker,
            model:      data.metadata?.model,
            confidence: data.metadata?.confidence,
            latency:    data.metadata?.latency_ms,
            routerType: data.metadata?.router_type,
            reasoning:  data.metadata?.reasoning,
            strategy:   data.metadata?.strategy,
            planSteps:  data.metadata?.plan_steps,
          },
        ]);
        fetchConversations();
        await awardXP("message", { mode });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Connection failed. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-base)" }}>
        <AgentDots count={3} />
      </div>
    );
  }

  if (!isSignedIn) return <RedirectToSignIn />;

  // ─── Derived display values ───────────────────────────────────────────────

  const activeMode = MODES.find((m) => m.id === mode)!;
  const xp = gami?.xp ?? 0;
  const level = gami ? getLevelFromXP(xp) : LEVELS[0];
  const { progress: lvlProgress } = gami ? getLevelProgress(xp) : { progress: 0 };
  const currentAchievement = pendingAchievements[0] ?? null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden", position: "relative" }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)",
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Brand */}
          <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, var(--blue), var(--purple))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
                boxShadow: "0 0 12px var(--blue-glow)",
              }}>⬡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>HOLDING OS</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>MISSION CONTROL</div>
              </div>
            </div>

            <button
              onClick={newChat}
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 8,
                border: "1px solid var(--blue)",
                background: "var(--blue-glow2)",
                color: "var(--blue)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--blue-glow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--blue-glow2)";
              }}
            >
              + New Mission
            </button>
          </div>

          {/* User / XP Card */}
          {gami && (
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <UserButton afterSignOutUrl="/sign-in" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: levelColor(level.level),
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {level.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                    Level {level.level} · {gami.xp.toLocaleString()} XP
                  </div>
                </div>
                {gami.streak > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 3,
                    background: "rgba(249,115,22,0.12)",
                    border: "1px solid rgba(249,115,22,0.3)",
                    borderRadius: 6, padding: "2px 7px",
                  }}>
                    <span style={{ fontSize: 12 }}>🔥</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)" }}>{gami.streak}</span>
                  </div>
                )}
              </div>
              <XPBar progress={lvlProgress} color={levelColor(level.level)} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {gami.totalMessages} messages
                </span>
                {gami.xpToNext > 0 && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {gami.xpToNext} XP to next
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
              Routing Mode
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {MODES.map((m) => {
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: `1px solid ${isActive ? m.color : "transparent"}`,
                      background: isActive ? `color-mix(in srgb, ${m.color} 12%, transparent)` : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: isActive ? m.color : "var(--text-secondary)",
                        lineHeight: 1.2,
                      }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, lineHeight: 1.3 }}>{m.desc}</div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActive ? m.color : "var(--text-dim)",
                      fontFamily: "var(--font-mono)",
                    }}>+{m.xp}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 18px 6px", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              Missions
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
              {conversations.length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  No missions yet
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conversationId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 10px",
                        borderRadius: 7,
                        cursor: "pointer",
                        background: isActive ? "var(--bg-elevated)" : "transparent",
                        border: `1px solid ${isActive ? "var(--border)" : "transparent"}`,
                        marginBottom: 2,
                        transition: "all 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      <span style={{ fontSize: 10, color: isActive ? "var(--blue)" : "var(--text-muted)", flexShrink: 0 }}>▶</span>
                      <span style={{ flex: 1, fontSize: 12, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.title}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDate(conv.updatedAt)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: 12, padding: "0 2px",
                          flexShrink: 0, opacity: 0,
                        }}
                        className="delete-btn"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--rose)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                      >✕</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Achievements strip */}
          {gami && gami.achievements.length > 0 && (
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Unlocked ({gami.achievements.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {gami.achievements.slice(0, 8).map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id);
                  return a ? (
                    <span
                      key={id}
                      title={`${a.title}: ${a.description}`}
                      style={{
                        fontSize: 16,
                        cursor: "default",
                        opacity: 0.9,
                        transition: "opacity 0.1s",
                      }}
                    >{a.icon}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 52,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 16, padding: 4,
                borderRadius: 6, display: "flex", alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >☰</button>

            {/* Active mode pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              background: `color-mix(in srgb, ${activeMode.color} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${activeMode.color} 30%, transparent)`,
            }}>
              <span style={{ fontSize: 13 }}>{activeMode.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: activeMode.color, letterSpacing: "0.04em" }}>
                {activeMode.label.toUpperCase()}
              </span>
            </div>

            {conversationId && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                #{conversationId.slice(0, 7)}
              </span>
            )}
          </div>

          {/* Header right: legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {Object.entries(MODEL_META).map(([, meta]) => (
                <span key={meta.label} style={{ fontSize: 11, color: meta.color, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                  {meta.label}
                </span>
              ))}
            </div>
            {!sidebarOpen && <UserButton afterSignOutUrl="/sign-in" />}
          </div>
        </header>

        {/* Messages */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
          {loadingHistory ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 24px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer-bg" style={{ height: 72, borderRadius: 12, opacity: 0.6 }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            /* ── Empty state ── */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 160px)", padding: "0 24px" }}>
              <div style={{
                textAlign: "center",
                maxWidth: 540,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: "linear-gradient(135deg, var(--blue), var(--purple))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 20px",
                  boxShadow: "0 0 32px var(--blue-glow)",
                  animation: "pulse-glow 3s ease-in-out infinite",
                }}>⬡</div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                  Mission Control Ready
                </h1>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 32px", lineHeight: 1.6 }}>
                  Dispatch your query to the multi-agent network.<br />
                  Switch modes in the sidebar to change routing strategy.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
                  {EMPTY_EXAMPLES.map((ex) => {
                    const m = MODES.find((x) => x.id === ex.mode)!;
                    return (
                      <button
                        key={ex.mode}
                        onClick={() => {
                          setMode(ex.mode as Mode);
                          setInput(ex.text);
                          inputRef.current?.focus();
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--bg-surface)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = m.color;
                          el.style.background = `color-mix(in srgb, ${m.color} 6%, var(--bg-surface))`;
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = "var(--border)";
                          el.style.background = "var(--bg-surface)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{m.icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: m.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          &ldquo;{ex.text}&rdquo;
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  {Object.entries(MODEL_META).map(([, meta]) => (
                    <span key={meta.label} style={{ fontSize: 11, color: meta.color, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                      {meta.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 20px" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="animate-slide-up"
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {msg.role === "user" ? (
                    /* User bubble */
                    <div style={{
                      maxWidth: "70%",
                      padding: "12px 16px",
                      borderRadius: "16px 16px 4px 16px",
                      background: "linear-gradient(135deg, var(--blue-dim), var(--blue))",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1.6,
                      boxShadow: "0 2px 16px var(--blue-glow)",
                    }}>
                      {msg.content}
                    </div>
                  ) : (
                    /* Agent card */
                    <div style={{
                      maxWidth: "78%",
                      background: "var(--bg-card)",
                      border: `1px solid var(--border)`,
                      borderRadius: "4px 16px 16px 16px",
                      overflow: "hidden",
                      boxShadow: msg.model && MODEL_META[msg.model]
                        ? `0 2px 20px ${MODEL_META[msg.model].glow}`
                        : "0 2px 12px rgba(0,0,0,0.3)",
                    }}>
                      {/* Card header */}
                      {msg.model && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 14px 8px",
                          borderBottom: "1px solid var(--border-subtle)",
                          background: "var(--bg-elevated)",
                        }}>
                          {/* Model badge */}
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            color: MODEL_META[msg.model]?.color ?? "var(--text-secondary)",
                            background: `color-mix(in srgb, ${MODEL_META[msg.model]?.color ?? "transparent"} 14%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${MODEL_META[msg.model]?.color ?? "transparent"} 30%, transparent)`,
                            letterSpacing: "0.04em",
                            fontFamily: "var(--font-mono)",
                          }}>
                            {MODEL_META[msg.model]?.label ?? msg.model}
                          </span>

                          {/* Strategy */}
                          {msg.strategy && (
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-card)", padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border)" }}>
                              {STRATEGY_BADGES[msg.strategy] ?? msg.strategy}
                            </span>
                          )}

                          <div style={{ flex: 1 }} />

                          {/* Latency */}
                          {msg.latency !== undefined && (
                            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {msg.latency}ms
                            </span>
                          )}

                          {/* Confidence */}
                          {msg.confidence !== undefined && (
                            <span style={{
                              fontSize: 10, fontFamily: "var(--font-mono)",
                              color: msg.confidence >= 0.8 ? "var(--emerald)" : msg.confidence >= 0.5 ? "var(--amber)" : "var(--rose)",
                            }}>
                              {Math.round(msg.confidence * 100)}%
                            </span>
                          )}

                          {/* Plan steps toggle */}
                          {msg.planSteps && msg.planSteps.length > 1 && (
                            <button
                              onClick={() => setExpandedSteps(expandedSteps === msg.id ? null : msg.id)}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: 11, color: "var(--blue)", fontWeight: 600,
                                padding: "2px 4px",
                              }}
                            >
                              {expandedSteps === msg.id ? "▼" : "▶"} {msg.planSteps.length} steps
                            </button>
                          )}
                        </div>
                      )}

                      {/* Plan steps */}
                      {expandedSteps === msg.id && msg.planSteps && (
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 6 }}>
                          {msg.planSteps.map((step) => {
                            const stepMeta = MODEL_META[step.model];
                            return (
                              <div key={step.stepId} style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: 8,
                                padding: "8px 12px",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                    STEP {step.stepId}
                                  </span>
                                  <span style={{ fontSize: 10, color: stepMeta?.color ?? "var(--text-muted)", fontWeight: 600 }}>
                                    {stepMeta?.label ?? step.model}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                  {step.content.slice(0, 160)}{step.content.length > 160 ? "…" : ""}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ padding: "12px 14px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </div>

                      {/* Rating */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderTop: "1px solid var(--border-subtle)",
                      }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Rate</span>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = (msg.rating ?? 0) >= star;
                          return (
                            <button
                              key={star}
                              onClick={() => handleRate(msg, star)}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: 15,
                                color: filled ? "var(--amber)" : "var(--text-dim)",
                                transition: "all 0.1s ease",
                                padding: "0 1px",
                                lineHeight: 1,
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--amber)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.2)"; }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color = filled ? "var(--amber)" : "var(--text-dim)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                              }}
                            >★</button>
                          );
                        })}
                        {msg.rating && (
                          <span style={{ fontSize: 10, color: "var(--amber)", marginLeft: 2, fontFamily: "var(--font-mono)" }}>
                            +{msg.rating >= 5 ? 10 : msg.rating >= 4 ? 5 : 0} XP
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading state */}
              {loading && (
                <div className="animate-fade-in" style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minWidth: 200,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AgentDots count={3} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                        {LOADING_LABELS[mode]}
                      </span>
                    </div>
                    {mode === "swarm" && (
                      <div style={{ display: "flex", gap: 6, paddingTop: 2 }}>
                        {["GPT Planner", "Claude Build", "Claude Review"].map((agent, i) => (
                          <span key={agent} style={{
                            fontSize: 10, padding: "2px 7px", borderRadius: 12,
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                            animation: `agent-dot 1.4s ease-in-out ${i * 0.3}s infinite`,
                          }}>{agent}</span>
                        ))}
                      </div>
                    )}
                    {mode === "agent" && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        Analyzing → Planning → Executing
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Input Zone */}
        <footer style={{
          borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)",
          padding: "14px 20px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={`Dispatch to ${activeMode.label}… (Enter to send)`}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${loading ? "var(--border)" : "var(--border)"}`,
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--blue)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: loading || !input.trim()
                  ? "var(--bg-elevated)"
                  : `linear-gradient(135deg, ${activeMode.color}, ${activeMode.color}cc)`,
                color: loading || !input.trim() ? "var(--text-muted)" : "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
                transition: "all 0.15s ease",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: !loading && input.trim() ? `0 0 16px color-mix(in srgb, ${activeMode.color} 30%, transparent)` : "none",
              }}
            >
              {loading ? <AgentDots count={3} /> : <>SEND →</>}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    background: "none", border: "none",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    cursor: "pointer",
                    color: mode === m.id ? m.color : "var(--text-muted)",
                    fontWeight: mode === m.id ? 700 : 400,
                    transition: "all 0.12s ease",
                    letterSpacing: mode === m.id ? "0.02em" : "normal",
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            {gami && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {activeMode.xp} XP per dispatch
              </span>
            )}
          </div>
        </footer>
      </div>

      {/* ── Floating XP Notification ────────────────────────────────────────── */}
      {xpGain && (
        <div
          key={xpGain.id}
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "var(--bg-card)",
            border: "1px solid var(--amber)",
            borderRadius: 24,
            padding: "6px 18px",
            fontSize: 15,
            fontWeight: 800,
            color: "var(--amber)",
            boxShadow: "0 0 20px var(--amber-glow)",
            animation: "xp-float 1.6s ease-out forwards",
            letterSpacing: "0.04em",
            fontFamily: "var(--font-mono)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          +{xpGain.amount} XP
        </div>
      )}

      {/* ── Achievement Toast ───────────────────────────────────────────────── */}
      {currentAchievement && (
        <AchievementToast
          achievement={currentAchievement}
          onDone={() => setPendingAchievements((prev) => prev.slice(1))}
        />
      )}

      {/* ── Hover reveal for delete buttons (CSS trick via global style) ─────── */}
      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
        input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}
