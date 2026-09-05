import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, insertUser } from "@/lib/db";
import { createNewUser } from "@/lib/user-defaults";
import { setSessionCookie, toPublicUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email    = typeof body?.email    === "string" ? body.email.trim()    : "";
  const password = typeof body?.password === "string" ? body.password        : "";
  const name     = typeof body?.name     === "string" ? body.name            : "";

  if (!email || !email.includes("@"))
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (findUserByEmail(email))
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const user = createNewUser(email, password, name);

  // Apply optional wallet / policy overrides from the multi-step signup form
  if (body?.wallet?.balance != null) {
    const bal = Number(body.wallet.balance);
    if (Number.isFinite(bal) && bal >= 0) user.wallet.balance = Math.round(bal);
  }
  if (typeof body?.wallet?.savedMethodLabel === "string" && body.wallet.savedMethodLabel.trim()) {
    user.wallet.savedMethodLabel = body.wallet.savedMethodLabel.trim().slice(0, 80);
  }
  if (body?.policy) {
    const p = body.policy;
    const clamp = (v: unknown, fb: number) =>
      typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : fb;
    user.policy.maxTransactionAmount = clamp(p.maxTransactionAmount, user.policy.maxTransactionAmount);
    user.policy.dailySpendingLimit   = clamp(p.dailySpendingLimit,   user.policy.dailySpendingLimit);
    user.policy.hardCeiling          = Math.max(
      clamp(p.hardCeiling, user.policy.hardCeiling),
      user.policy.maxTransactionAmount,
    );
  }

  insertUser(user);
  await setSessionCookie(user.id);
  return NextResponse.json({ user: toPublicUser(user) });
}
