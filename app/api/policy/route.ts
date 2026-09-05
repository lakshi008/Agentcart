import { NextRequest, NextResponse } from "next/server";
import { evaluatePolicy } from "@/lib/policy";
import { sumCapturedToday } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { getCart, isApprovalGranted, getPaymentAttempts } from "@/lib/session";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const overrideRequested = Boolean(body?.override);

  const cart = getCart(user.id);
  if (!cart) {
    return NextResponse.json({ error: "No active cart. Talk to the agent first." }, { status: 400 });
  }

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

  logEvent(user.id, {
    eventType: decision.allowed ? "POLICY_CHECK_PASSED" : "POLICY_CHECK_FAILED",
    actor: "system",
    action: decision.overridden ? "Policy re-evaluated with manual override" : "Policy re-evaluated",
    reason: decision.reason,
    metadata: { checks: decision.checks, total: cart.total, overridden: decision.overridden ?? false },
    status: decision.allowed ? "success" : "blocked",
  });

  return NextResponse.json({ decision, policy: user.policy, cart });
}
