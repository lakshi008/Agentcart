import type { AuditEvent, AuditEventType } from "@/types";
import { insertAuditEvent, listAuditEventsByUser } from "@/lib/db";

// Append-only audit trail, persisted per-user via lib/db.ts so it survives
// server restarts (unlike the cart/session state in lib/session.ts, which
// is fine to lose — an in-progress cart isn't a record of anything that
// actually happened yet).

let counter = 0;

export function logEvent(
  userId: string,
  input: {
    eventType: AuditEventType;
    actor: AuditEvent["actor"];
    action: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    status: AuditEvent["status"];
  }
): AuditEvent {
  counter += 1;
  const event: AuditEvent = {
    id: `evt_${Date.now()}_${counter}`,
    userId,
    timestamp: new Date().toISOString(),
    ...input,
  };
  insertAuditEvent(event);
  return event;
}

export function getAuditTrail(userId: string): AuditEvent[] {
  return listAuditEventsByUser(userId);
}
