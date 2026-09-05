"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X, Eye, Target, SlidersHorizontal, Search, BarChart3, CheckCircle2, Sparkles, ShieldCheck, Hourglass, CreditCard, BadgeCheck, Ban } from "lucide-react";
import type { AgentActivityStep } from "@/types";
import { timeOnly } from "@/lib/format";

const ICONS: Record<AgentActivityStep["icon"], React.ElementType> = {
  understand: Eye, intent: Target, constraints: SlidersHorizontal, search: Search,
  rank: BarChart3, select: CheckCircle2, upsell: Sparkles, policy: ShieldCheck,
  approval: Hourglass, payment: CreditCard, verify: BadgeCheck, blocked: Ban,
};
const STATUS_CLR: Record<AgentActivityStep["status"], { border: string; bg: string; color: string }> = {
  done:    { border: "var(--success)", bg: "var(--success-soft)", color: "var(--success)" },
  active:  { border: "var(--rose)",    bg: "var(--rose-soft)",    color: "var(--rose)" },
  pending: { border: "var(--border)",  bg: "var(--bg-2)",         color: "var(--text-lo)" },
  warning: { border: "var(--warn)",    bg: "var(--warn-soft)",    color: "var(--warn)" },
  blocked: { border: "var(--danger)",  bg: "var(--danger-soft)",  color: "var(--danger)" },
};

export default function ActivityDrawer({ open, onClose, steps }:
  { open: boolean; onClose: () => void; steps: AgentActivityStep[] }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="fixed right-0 top-0 z-50 h-dvh w-full max-w-sm border-l overflow-hidden"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-lo)" }}>Live pipeline</p>
                <h2 className="font-display text-lg" style={{ color: "var(--text-hi)" }}>Agent Activity</h2>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 transition hover:opacity-70" style={{ color: "var(--text-lo)" }}><X size={16} /></button>
            </div>
            <div className="h-[calc(100dvh-73px)] overflow-y-auto px-5 py-5">
              {steps.length === 0 ? (
                <p className="mt-10 text-center text-sm" style={{ color: "var(--text-lo)" }}>Talk to the agent to see its reasoning here.</p>
              ) : (
                <ol className="relative">
                  {steps.map((s, i) => {
                    const Icon = ICONS[s.icon];
                    const clr  = STATUS_CLR[s.status];
                    return (
                      <li key={s.id} className="relative flex gap-3 pb-6">
                        {i < steps.length - 1 && (
                          <span className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px" style={{ background: "var(--border)" }} />
                        )}
                        <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                          style={{ borderColor: clr.border, background: clr.bg, color: clr.color }}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium" style={{ color: "var(--text-hi)" }}>{s.label}</p>
                            <span className="shrink-0 font-mono text-[10px]" style={{ color: "var(--text-lo)" }}>{timeOnly(s.timestamp)}</span>
                          </div>
                          {s.detail && <p className="mt-0.5 text-xs" style={{ color: "var(--text-mid)" }}>{s.detail}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
