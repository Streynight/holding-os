import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getConversation, deleteConversation, getConversationMessages } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const { id } = await context.params;
    const conv = await getConversation(id);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (conv.userId !== authResult.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await getConversationMessages(id);
    return NextResponse.json({ conversation: { ...conv, messages } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const authResult = await requireUser();
    if (authResult.response) return authResult.response;

    const { id } = await context.params;
    const conv = await getConversation(id);
    if (!conv || conv.userId !== authResult.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
