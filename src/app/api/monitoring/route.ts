import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMonitoringSnapshot } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const snapshot = await getMonitoringSnapshot(limit);

    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: "Failed to get monitoring data" }, { status: 500 });
  }
}
