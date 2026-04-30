import { NextRequest, NextResponse } from "next/server";
import { getConversation, deleteConversation, getConversationMessages } from "@/lib/storage";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const { id } = await context.params;
    const conv = await getConversation(id);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const messages = await getConversationMessages(id);
    return NextResponse.json({ conversation: { ...conv, messages } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const { id } = await context.params;
    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
