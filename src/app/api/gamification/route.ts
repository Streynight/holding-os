import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireUser } from "@/lib/auth";
import {
  getLevelFromXP,
  getLevelProgress,
  XP_REWARDS,
  checkNewAchievements,
  type GamificationState,
} from "@/lib/gamification";

export const dynamic = "force-dynamic";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return new Redis({ url: url!, token: token! });
}

interface StoredGami extends Record<string, unknown> {
  xp: number;
  streak: number;
  lastActiveDate: string;
  achievements: string[];
  totalMessages: number;
  routersUsed: string[];
}

async function getGami(redis: Redis, userId: string): Promise<StoredGami> {
  const raw = await redis.hgetall<StoredGami>(`gami:${userId}`);
  if (!raw) {
    return { xp: 0, streak: 0, lastActiveDate: "", achievements: [], totalMessages: 0, routersUsed: [] };
  }
  return {
    xp:             typeof raw.xp === "number" ? raw.xp : 0,
    streak:         typeof raw.streak === "number" ? raw.streak : 0,
    lastActiveDate: typeof raw.lastActiveDate === "string" ? raw.lastActiveDate : "",
    achievements:   Array.isArray(raw.achievements) ? raw.achievements : [],
    totalMessages:  typeof raw.totalMessages === "number" ? raw.totalMessages : 0,
    routersUsed:    Array.isArray(raw.routersUsed) ? raw.routersUsed : [],
  };
}

function toState(g: StoredGami): GamificationState {
  const level = getLevelFromXP(g.xp);
  const { progress, xpToNext } = getLevelProgress(g.xp);
  return {
    xp:            g.xp,
    level:         level.level,
    levelTitle:    level.title,
    levelProgress: progress,
    xpToNext,
    streak:        g.streak,
    totalMessages: g.totalMessages,
    achievements:  g.achievements,
    routersUsed:   g.routersUsed,
  };
}

function updateStreak(g: StoredGami): StoredGami {
  const today = new Date().toISOString().slice(0, 10);
  if (g.lastActiveDate === today) return g;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const streak = g.lastActiveDate === yesterday ? g.streak + 1 : 1;
  return { ...g, streak, lastActiveDate: today };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;
    const userId = authResult.userId!;

    const redis = getRedis();
    const g = await getGami(redis, userId);
    return NextResponse.json({ state: toState(g) });
  } catch (err) {
    console.error("GET /api/gamification", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;
    const userId = authResult.userId!;

    const body = await request.json() as { action: string; mode?: string; rating?: number };
    const { action, mode, rating } = body;

    const redis = getRedis();
    let g = await getGami(redis, userId);
    g = updateStreak(g);

    let xpGained = 0;
    let newAchievements: string[] = [];

    if (action === "message" && mode) {
      const rewardKey = `MESSAGE_${mode.toUpperCase()}` as keyof typeof XP_REWARDS;
      xpGained = XP_REWARDS[rewardKey] ?? XP_REWARDS.MESSAGE_KEYWORD;

      // Streak day bonus (capped at +20)
      const streakBonus = Math.min(g.streak * 2, 20);
      xpGained += streakBonus;

      g.xp += xpGained;
      g.totalMessages += 1;

      if (!g.routersUsed.includes(mode)) {
        g.routersUsed = [...g.routersUsed, mode];
      }

      newAchievements = checkNewAchievements(
        g.achievements, g.totalMessages, g.xp, g.streak, g.routersUsed, null
      );
      g.achievements = [...g.achievements, ...newAchievements];
    }

    if (action === "feedback" && rating) {
      const rewardKey = rating === 5 ? "FEEDBACK_5STAR" : rating >= 4 ? "FEEDBACK_4STAR" : null;
      if (rewardKey) {
        xpGained = XP_REWARDS[rewardKey];
        g.xp += xpGained;
      }
      newAchievements = checkNewAchievements(
        g.achievements, g.totalMessages, g.xp, g.streak, g.routersUsed, rating
      );
      g.achievements = [...g.achievements, ...newAchievements];
    }

    await redis.hset(`gami:${userId}`, {
      xp:             g.xp,
      streak:         g.streak,
      lastActiveDate: g.lastActiveDate,
      achievements:   g.achievements,
      totalMessages:  g.totalMessages,
      routersUsed:    g.routersUsed,
    });

    return NextResponse.json({ state: toState(g), xpGained, newAchievements });
  } catch (err) {
    console.error("POST /api/gamification", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
