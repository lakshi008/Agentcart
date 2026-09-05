import { NextResponse } from "next/server";
import { getAuditTrail } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ events: getAuditTrail(user.id) });
}
