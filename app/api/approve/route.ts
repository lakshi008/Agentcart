import { NextRequest, NextResponse } from "next/server";
import { grantApproval, getCart } from "@/lib/session";
import { logEvent } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const overridden = Boolean(body?.overridden);

  const cart = getCart(user.id);
  if (!cart) return NextResponse.json({ error: "No active cart to approve." }, { status: 400 });

  grantApproval(user.id);

  logEvent(user.id, {
    eventType: "USER_APPROVED",
    actor: "user",
    action: overridden
      ? `Approved payment of ₹${cart.total.toLocaleString("en-IN")} (manual override of spending limit)`
      : `Approved payment of ₹${cart.total.toLocaleString("en-IN")}`,
    status: "success",
    metadata: { total: cart.total, overridden },
  });

  return NextResponse.json({ approved: true });
}
