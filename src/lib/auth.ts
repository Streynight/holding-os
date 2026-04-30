import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function requireUser(): Promise<
  | { userId: string; response?: never }
  | { userId?: never; response: NextResponse }
> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId };
}
