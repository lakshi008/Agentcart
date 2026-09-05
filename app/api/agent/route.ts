import { NextRequest, NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agent";
import { setCart } from "@/lib/session";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const turn = await runAgentTurn({
      userId: user.id,
      message,
      policy: user.policy,
    });
    if (turn.mode === "shopping") {
      setCart(user.id, turn.cart);
    }

    return NextResponse.json(turn);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Agent failed to process the request.";
    return NextResponse.json({ error: messageText }, { status: 422 });
  }
}
