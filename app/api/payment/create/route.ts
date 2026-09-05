import { NextRequest, NextResponse } from "next/server";
import { evaluatePolicy } from "@/lib/policy";
import { sumCapturedToday } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { getCart, isApprovalGranted, getPaymentAttempts, recordPaymentAttempt } from "@/lib/session";
import { paymentProvider } from "@/lib/payment";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const overrideRequested = Boolean(body?.override);

  const cart = getCart(user.id);
  if (!cart) return NextResponse.json({ error: "No active cart." }, { status: 400 });

  // The policy engine — not the AI, not the frontend — is the sole gate here.
  const decision = evaluatePolicy({
    cart,
    policy: user.policy,
    spentToday: sumCapturedToday(user.id),
    approvalGranted: isApprovalGranted(user.id),
    paymentAttemptsUsed: getPaymentAttempts(user.id),
    overrideRequested,
    hardCeiling: user.policy.hardCeiling,
    walletBalance: user.wallet.balance,
  });

  if (!decision.allowed) {
    logEvent(user.id, {
      eventType: "PAYMENT_BLOCKED",
      actor: "system",
      action: "Payment order was not created",
      reason: decision.reason,
      metadata: { checks: decision.checks, total: cart.total },
      status: "blocked",
    });
    return NextResponse.json({ blocked: true, decision }, { status: 403 });
  }

  recordPaymentAttempt(user.id);

  const amountPaise = Math.round(cart.total * 100);
  const order = await paymentProvider.createOrder(amountPaise, "INR");

  if (!order.success) {
    logEvent(user.id, {
      eventType: "PAYMENT_FAILED",
      actor: "system",
      action: "Razorpay order creation failed",
      reason: order.reason,
      status: "failed",
    });
    return NextResponse.json({ order }, { status: 502 });
  }

  logEvent(user.id, {
    eventType: "PAYMENT_ORDER_CREATED",
    actor: "system",
    action: decision.overridden
      ? `Created payment order ${order.orderId} (manual override applied)`
      : `Created payment order ${order.orderId}`,
    metadata: { orderId: order.orderId, amount: cart.total, overridden: decision.overridden ?? false },
    status: "success",
  });

  return NextResponse.json({ order, cart, overridden: decision.overridden ?? false });
}
