"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock } from "lucide-react";
import type { AuditEvent } from "@/types";
import { timeOnly } from "@/lib/format";

const DOT: Record<AuditEvent["status"], string> = {
  success: "var(--success)", pending: "var(--warn)", blocked: "var(--danger)", failed: "var(--danger)",
};

export default function AuditDrawer({ open, onClose, events }:
  { open: boolean; onClose: () => void; events: AuditEvent[] }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="fixed right-0 top-0 z-50 h-dvh w-full max-w-md border-l overflow-hidden"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Lock size={13} style={{ color: "var(--text-lo)" }} />
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-lo)" }}>Append-only</p>
                  <h2 className="font-display text-lg" style={{ color: "var(--text-hi)" }}>Audit Trail</h2>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5" style={{ color: "var(--text-lo)" }}><X size={16} /></button>
            </div>
            <div className="h-[calc(100dvh-73px)] overflow-y-auto px-5 py-5">
              {events.length === 0 ? (
                <p className="mt-10 text-center text-sm" style={{ color: "var(--text-lo)" }}>No events yet.</p>
              ) : (
                <div>
                  {events.map((e) => (
                    <div key={e.id} className="border-l-2 pb-5 pl-4" style={{ borderColor: "var(--border)" }}>
                      <div className="-ml-[21px] mb-1 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT[e.status] }} />
                        <span className="font-mono text-[10px]" style={{ color: "var(--text-lo)" }}>{timeOnly(e.timestamp)}</span>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--rose)" }}>{e.eventType}</p>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-hi)" }}>{e.action}</p>
                      {e.reason && <p className="mt-1 text-xs" style={{ color: "var(--text-mid)" }}>{e.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
