"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldCheck, CreditCard, ScrollText, XCircle, PartyPopper } from "lucide-react";
import { inr } from "@/lib/format";

export type PaymentStage = "idle"|"approving"|"checking-policy"|"creating-order"|"checkout"|"processing"|"success"|"failed";

const STEPS: { key: PaymentStage; label: string; icon: React.ElementType }[] = [
  { key: "approving",       label: "User approval received",    icon: Check },
  { key: "checking-policy", label: "Checking transaction policy", icon: ShieldCheck },
  { key: "creating-order",  label: "Creating payment order",    icon: CreditCard },
  { key: "checkout",        label: "Opening secure checkout",   icon: ScrollText },
  { key: "processing",      label: "Waiting for payment",       icon: Loader2 },
];
const ORDER: PaymentStage[] = ["approving","checking-policy","creating-order","checkout","processing","success"];

function stepStatus(k: PaymentStage, cur: PaymentStage): "done"|"active"|"pending" {
  if (cur === "success" || cur === "failed") return "done";
  const ki = ORDER.indexOf(k), ci = ORDER.indexOf(cur);
  return ki < ci ? "done" : ki === ci ? "active" : "pending";
}

export default function PaymentOverlay({ stage, amount, orderId, failReason, onClose }:
  { stage: PaymentStage; amount: number; orderId: string|null; failReason: string|null; onClose: () => void }) {
  const isTerminal = stage === "success" || stage === "failed";
  return (
    <AnimatePresence>
      {stage !== "idle" && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-full max-w-md rounded-t-3xl border p-6 sm:rounded-3xl sm:p-8"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}>

            {!isTerminal && (
              <>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-lo)" }}>Payment Authorization</p>
                <h2 className="font-display text-2xl mb-6" style={{ color: "var(--text-hi)" }}>{inr(amount)}</h2>
                <div className="space-y-4">
                  {STEPS.map(s => {
                    const st = stepStatus(s.key, stage);
                    const Icon = s.icon;
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                          style={{
                            borderColor: st === "done" ? "var(--success)" : st === "active" ? "var(--rose)" : "var(--border)",
                            background:  st === "done" ? "var(--success-soft)" : st === "active" ? "var(--rose-soft)" : "var(--bg-2)",
                            color:       st === "done" ? "var(--success)" : st === "active" ? "var(--rose)" : "var(--text-lo)",
                          }}>
                          {st === "active" && s.key === "processing"
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Icon size={13} />}
                        </span>
                        <span className="text-sm" style={{ color: st === "pending" ? "var(--text-lo)" : "var(--text-hi)" }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {stage === "success" && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4"
                  style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <PartyPopper size={26} />
                </div>
                <h2 className="font-display text-2xl mb-5" style={{ color: "var(--text-hi)" }}>Payment Successful</h2>
                <div className="rounded-2xl border p-4 mb-5 space-y-2 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}>
                  <Row label="Amount Paid" value={inr(amount)} />
                  <Row label="Order ID"    value={orderId ?? "—"} mono />
                  <Row label="Status"      value="Captured" accent />
                </div>
                <button onClick={onClose} className="btn-primary w-full justify-center" style={{ background: "var(--accent)" }}>Done</button>
              </motion.div>
            )}

            {stage === "failed" && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4"
                  style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  <XCircle size={26} />
                </div>
                <h2 className="font-display text-2xl mb-2" style={{ color: "var(--text-hi)" }}>Payment Failed</h2>
                <p className="text-sm mb-3" style={{ color: "var(--text-mid)" }}>{failReason ?? "Test payment declined."}</p>
                <p className="text-xs mb-6" style={{ color: "var(--text-lo)" }}>No additional attempt was made — policy allows only one attempt per transaction.</p>
                <button onClick={onClose} className="btn-ghost w-full justify-center">Close</button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--text-lo)" }}>{label}</span>
      <span className={mono ? "font-mono text-xs" : ""} style={{ color: accent ? "var(--success)" : "var(--text-hi)" }}>{value}</span>
    </div>
  );
}
