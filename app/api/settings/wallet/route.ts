import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const topUp = typeof body?.topUp === "number" && Number.isFinite(body.topUp) ? Math.max(0, Math.round(body.topUp)) : 0;
  const savedMethodLabel =
    typeof body?.savedMethodLabel === "string" && body.savedMethodLabel.trim()
      ? body.savedMethodLabel.trim().slice(0, 80)
      : user.wallet.savedMethodLabel;

  const updated = updateUser(user.id, {
    wallet: {
      balance: user.wallet.balance + topUp,
      savedMethodLabel,
    },
  });

  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: toPublicUser(updated) });
}
