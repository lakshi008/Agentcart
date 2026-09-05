import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";
import type { PolicyConfig } from "@/types";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body  = await req.json().catch(() => ({}));
  const patch: { policy?: PolicyConfig & { hardCeiling: number }; name?: string } = {};

  if (body.policy) {
    const p = body.policy;
    const clamp = (v: unknown, fb: number) =>
      typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : fb;
    const maxTransactionAmount = clamp(p.maxTransactionAmount, user.policy.maxTransactionAmount);
    const dailySpendingLimit   = clamp(p.dailySpendingLimit,   user.policy.dailySpendingLimit);
    const hardCeiling          = Math.max(
      clamp(p.hardCeiling, user.policy.hardCeiling),
      maxTransactionAmount,
      dailySpendingLimit
    );
    patch.policy = {
      maxTransactionAmount,
      dailySpendingLimit,
      maxQuantityPerItem:  clamp(p.maxQuantityPerItem,  user.policy.maxQuantityPerItem),
      userApprovalRequired: true,
      maxPaymentAttempts:  clamp(p.maxPaymentAttempts,  user.policy.maxPaymentAttempts),
      hardCeiling,
    };
  }

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 80);
  }

  const updated = updateUser(user.id, patch);
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ user: toPublicUser(updated) });
}
