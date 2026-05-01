import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserConversations } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const userId = authResult.userId;
    const conversations = await getUserConversations(userId);
    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
