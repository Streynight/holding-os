import { NextRequest, NextResponse } from "next/server";
import { getConversation, deleteConversation, getConversationMessages } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conv = await getConversation(params.id);
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await getConversationMessages(params.id);
    return NextResponse.json({ conversation: { ...conv, messages } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteConversation(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
