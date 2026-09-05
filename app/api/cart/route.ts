import { NextRequest, NextResponse } from "next/server";
import type { Cart } from "@/types";
import { setCart, getCart } from "@/lib/session";
import { logEvent } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ cart: getCart(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lines = Array.isArray(body?.lines) ? body.lines : null;
  if (!lines) return NextResponse.json({ error: "lines is required" }, { status: 400 });

  const total = lines.reduce(
    (sum: number, l: { price: number; quantity: number }) => sum + l.price * l.quantity,
    0
  );
  const cart: Cart = { lines, total };
  setCart(user.id, cart);

  logEvent(user.id, {
    eventType: "PRODUCT_ADDED",
    actor: "user",
    action: "Updated proposed cart",
    metadata: { lineCount: lines.length, total },
    status: "success",
  });

  return NextResponse.json({ cart: getCart(user.id) });
}
