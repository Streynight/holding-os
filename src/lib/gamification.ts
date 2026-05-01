export interface Level {
  level: number;
  title: string;
  xpRequired: number;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface GamificationState {
  xp: number;
  level: number;
  levelTitle: string;
  levelProgress: number; // 0–100
  xpToNext: number;
  streak: number;
  totalMessages: number;
  achievements: string[];
  routersUsed: string[];
}

export const LEVELS: Level[] = [
  { level: 1, title: "Rookie Operator", xpRequired: 0,    color: "#94a3b8" },
  { level: 2, title: "Field Agent",     xpRequired: 100,  color: "#4f8ef7" },
  { level: 3, title: "Specialist",      xpRequired: 250,  color: "#8b5cf6" },
  { level: 4, title: "Commander",       xpRequired: 500,  color: "#10b981" },
  { level: 5, title: "Director",        xpRequired: 1000, color: "#f59e0b" },
  { level: 6, title: "Grand Architect", xpRequired: 2000, color: "#f97316" },
  { level: 7, title: "Omniscient",      xpRequired: 5000, color: "#f43f5e" },
];

export const XP_REWARDS: Record<string, number> = {
  MESSAGE_KEYWORD: 10,
  MESSAGE_SMART:   15,
  MESSAGE_AGENT:   25,
  MESSAGE_SWARM:   40,
  FEEDBACK_4STAR:  5,
  FEEDBACK_5STAR:  10,
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_contact",       title: "First Contact",       description: "Send your first message",              icon: "🚀" },
  { id: "swarm_commander",     title: "Swarm Commander",     description: "Activate Swarm mode",                  icon: "♾️" },
  { id: "the_architect",       title: "The Architect",       description: "Use Agent Planning mode",              icon: "🧠" },
  { id: "smart_operator",      title: "Smart Operator",      description: "Use Smart Router mode",                icon: "🔑" },
  { id: "pattern_recognition", title: "Pattern Recognition", description: "Send 10 messages",                     icon: "🔍" },
  { id: "deep_thinker",        title: "Deep Thinker",        description: "Send 50 messages",                     icon: "💭" },
  { id: "five_stars",          title: "Five Stars",          description: "Give a perfect 5-star rating",         icon: "⭐" },
  { id: "week_warrior",        title: "Week Warrior",        description: "Maintain a 7-day streak",              icon: "🔥" },
  { id: "polyglot_router",     title: "Polyglot Router",     description: "Use all 4 routing modes",              icon: "🌐" },
  { id: "centurion",           title: "Centurion",           description: "Earn 1000 XP",                        icon: "💯" },
];

export function getLevelFromXP(xp: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number): Level | null {
  return LEVELS.find((l) => l.level === currentLevel + 1) ?? null;
}

export function getLevelProgress(xp: number): { progress: number; xpToNext: number } {
  const current = getLevelFromXP(xp);
  const next = getNextLevel(current.level);
  if (!next) return { progress: 100, xpToNext: 0 };

  const rangeStart = current.xpRequired;
  const rangeEnd = next.xpRequired;
  const progress = Math.round(((xp - rangeStart) / (rangeEnd - rangeStart)) * 100);
  return { progress: Math.max(0, Math.min(100, progress)), xpToNext: rangeEnd - xp };
}

export function checkNewAchievements(
  earned: string[],
  totalMessages: number,
  totalXP: number,
  streak: number,
  routersUsed: string[],
  rating: number | null
): string[] {
  const newOnes: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.includes(id)) newOnes.push(id);
  };

  check("first_contact",       totalMessages >= 1);
  check("pattern_recognition", totalMessages >= 10);
  check("deep_thinker",        totalMessages >= 50);
  check("swarm_commander",     routersUsed.includes("swarm"));
  check("the_architect",       routersUsed.includes("agent"));
  check("smart_operator",      routersUsed.includes("smart"));
  check("five_stars",          rating === 5);
  check("week_warrior",        streak >= 7);
  check("centurion",           totalXP >= 1000);
  check("polyglot_router",     ["keyword", "smart", "agent", "swarm"].every((r) => routersUsed.includes(r)));

  return newOnes;
}
