import type { Cart, PolicyCheckResult, PolicyConfig, PolicyDecision } from "@/types";
import { getProductById } from "@/lib/catalog";

// Default policy for a brand-new account (see lib/user-defaults.ts). Real
// per-user values live on the user record and are loaded by the caller.
// IMPORTANT: this file is never touched by the LLM. It is plain, deterministic
// backend logic and it is the only thing allowed to say "yes" to a payment.
export const DEFAULT_POLICY: PolicyConfig = {
  maxTransactionAmount: 3000,
  dailySpendingLimit: 5000,
  maxQuantityPerItem: 2,
  userApprovalRequired: true,
  maxPaymentAttempts: 1,
};

interface EvaluatePolicyParams {
  cart: Cart;
  policy?: PolicyConfig;
  spentToday?: number; // INR already spent today, before this transaction
  approvalGranted?: boolean;
  paymentAttemptsUsed?: number;
  /**
   * The user explicitly asked to push a transaction through even though it
   * exceeds their normal transaction/daily limits. This can only ever
   * relax the *soft* limits (transaction amount, daily spend) — it can
   * never bypass stock checks, the payment-attempt budget, or the absolute
   * ceiling below. "Bounded" stays true even when overridden.
   */
  overrideRequested?: boolean;
  /** Absolute ceiling that not even a manual override can cross. */
  hardCeiling?: number;
  /** Mock wallet balance available for this payment — insufficient funds is never overridable. */
  walletBalance?: number;
}

export function evaluatePolicy(params: EvaluatePolicyParams): PolicyDecision {
  const {
    cart,
    policy = DEFAULT_POLICY,
    spentToday = 0,
    approvalGranted = false,
    paymentAttemptsUsed = 0,
    overrideRequested = false,
    hardCeiling = policy.maxTransactionAmount * 5,
    walletBalance,
  } = params;

  const checks: PolicyCheckResult[] = [];

  // 1. Max transaction amount (soft limit — overridable)
  const withinTxnLimit = cart.total <= policy.maxTransactionAmount;
  checks.push({
    name: "Transaction Limit",
    status: withinTxnLimit ? "passed" : "failed",
    detail: withinTxnLimit
      ? `₹${cart.total.toLocaleString("en-IN")} is within the ₹${policy.maxTransactionAmount.toLocaleString("en-IN")} limit.`
      : `₹${cart.total.toLocaleString("en-IN")} exceeds your ₹${policy.maxTransactionAmount.toLocaleString("en-IN")} maximum transaction limit.`,
  });

  // 2. Daily spending limit (soft limit — overridable)
  const projectedTotal = spentToday + cart.total;
  const withinDailyLimit = projectedTotal <= policy.dailySpendingLimit;
  checks.push({
    name: "Daily Spending Limit",
    status: withinDailyLimit ? "passed" : "failed",
    detail: withinDailyLimit
      ? `₹${projectedTotal.toLocaleString("en-IN")} of ₹${policy.dailySpendingLimit.toLocaleString("en-IN")} daily limit used.`
      : `This purchase would bring today's spend to ₹${projectedTotal.toLocaleString("en-IN")}, exceeding your ₹${policy.dailySpendingLimit.toLocaleString("en-IN")} daily limit.`,
  });

  // 3. Absolute ceiling — never overridable, this is the hard backstop
  const withinCeiling = cart.total <= hardCeiling;
  checks.push({
    name: "Absolute Ceiling",
    status: withinCeiling ? "passed" : "failed",
    detail: withinCeiling
      ? `₹${cart.total.toLocaleString("en-IN")} is within your ₹${hardCeiling.toLocaleString("en-IN")} absolute ceiling.`
      : `₹${cart.total.toLocaleString("en-IN")} exceeds your ₹${hardCeiling.toLocaleString("en-IN")} absolute ceiling — this cannot be overridden. Raise it in Profile settings first.`,
  });

  // 4. Stock + quantity availability (never overridable)
  let stockOk = true;
  let stockDetail = "All items are in stock and within quantity limits.";
  for (const line of cart.lines) {
    const product = getProductById(line.productId);
    if (!product || product.stock < line.quantity) {
      stockOk = false;
      stockDetail = `${line.name} does not have enough stock to fulfil this order.`;
      break;
    }
    if (line.quantity > policy.maxQuantityPerItem) {
      stockOk = false;
      stockDetail = `${line.name} quantity (${line.quantity}) exceeds the max of ${policy.maxQuantityPerItem} per item.`;
      break;
    }
  }
  checks.push({ name: "Stock Availability", status: stockOk ? "passed" : "failed", detail: stockDetail });

  // 5b. Wallet balance — never overridable, you can't override not having the funds
  const walletOk = walletBalance == null || cart.total <= walletBalance;
  if (walletBalance != null) {
    checks.push({
      name: "Wallet Balance",
      status: walletOk ? "passed" : "failed",
      detail: walletOk
        ? `₹${walletBalance.toLocaleString("en-IN")} available in wallet.`
        : `Wallet balance ₹${walletBalance.toLocaleString("en-IN")} is insufficient for this ₹${cart.total.toLocaleString("en-IN")} payment. Top up in Profile.`,
    });
  }

  // 5. Payment attempt budget (never overridable)
  const attemptsOk = paymentAttemptsUsed < policy.maxPaymentAttempts;
  checks.push({
    name: "Payment Attempt Limit",
    status: attemptsOk ? "passed" : "failed",
    detail: attemptsOk
      ? `${paymentAttemptsUsed}/${policy.maxPaymentAttempts} attempts used.`
      : `Maximum of ${policy.maxPaymentAttempts} payment attempt(s) already used.`,
  });

  // 6. User approval — always required, evaluated last
  const approvalPending = policy.userApprovalRequired && !approvalGranted;
  checks.push({
    name: "User Approval",
    status: !policy.userApprovalRequired ? "passed" : approvalGranted ? "passed" : "pending",
    detail: approvalGranted
      ? "Explicit user approval received."
      : "Waiting for explicit user approval before payment can proceed.",
  });

  const hardBlocked = !withinCeiling || !stockOk || !attemptsOk || !walletOk;
  const softBlocked = !withinTxnLimit || !withinDailyLimit;
  const overrideApplies = overrideRequested && withinCeiling && !hardBlocked && softBlocked;

  let allowed: boolean;
  let reason: string | undefined;

  if (hardBlocked) {
    allowed = false;
    reason = !withinCeiling
      ? `₹${cart.total.toLocaleString("en-IN")} exceeds your absolute ceiling of ₹${hardCeiling.toLocaleString("en-IN")}, which cannot be overridden.`
      : !stockOk
        ? stockDetail
        : !walletOk
          ? `Wallet balance ₹${(walletBalance ?? 0).toLocaleString("en-IN")} is insufficient for this ₹${cart.total.toLocaleString("en-IN")} payment.`
          : "Maximum payment attempts reached for this transaction.";
  } else if (softBlocked && !overrideApplies) {
    allowed = false;
    reason = !withinTxnLimit
      ? `The proposed transaction amount ₹${cart.total.toLocaleString("en-IN")} exceeds your maximum allowed transaction limit of ₹${policy.maxTransactionAmount.toLocaleString("en-IN")}.`
      : `This purchase would exceed your daily spending limit of ₹${policy.dailySpendingLimit.toLocaleString("en-IN")}.`;
  } else if (approvalPending) {
    allowed = false;
    reason = "Waiting for explicit user approval.";
  } else {
    allowed = true;
  }

  return { allowed, reason, checks, overridden: overrideApplies && allowed };
}
