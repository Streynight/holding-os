import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getUserConversations } from "@/lib/storage";

const DEFAULT_USER = "default-user";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER;
    const conversations = await getUserConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
