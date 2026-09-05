import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { paymentProvider } from "@/lib/payment";
import { logEvent } from "@/lib/audit";
import { getCart, clearSession } from "@/lib/session";
import { getSessionUser } from "@/lib/auth";
import { insertOrder, updateUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const outcome: "success" | "failure" = body?.outcome === "failure" ? "failure" : "success";
  const overridden = Boolean(body?.overridden);

  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const cart = getCart(user.id);
  const result = await paymentProvider.verifyPayment(orderId, outcome);

  if (result.success) {
    logEvent(user.id, {
      eventType: "PAYMENT_SUCCESS",
      actor: "system",
      action: `₹${cart?.total.toLocaleString("en-IN") ?? "?"} successfully paid`,
      metadata: { orderId, amount: cart?.total ?? 0, overridden },
      status: "success",
    });

    if (cart) {
      insertOrder({
        id: `ord_${crypto.randomBytes(8).toString("hex")}`,
        userId: user.id,
        orderId,
        lines: cart.lines,
        total: cart.total,
        status: "captured",
        overridden,
        createdAt: new Date().toISOString(),
      });
      // Deduct from the mock wallet — this is what stands in for the saved
      // payment method actually being charged.
      updateUser(user.id, { wallet: { ...user.wallet, balance: user.wallet.balance - cart.total } });
    }

    clearSession(user.id);
  } else {
    logEvent(user.id, {
      eventType: "PAYMENT_FAILED",
      actor: "system",
      action: "Payment declined",
      reason: result.reason,
      metadata: { orderId },
      status: "failed",
    });

    if (cart) {
      insertOrder({
        id: `ord_${crypto.randomBytes(8).toString("hex")}`,
        userId: user.id,
        orderId,
        lines: cart.lines,
        total: cart.total,
        status: "failed",
        overridden,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ result });
}
