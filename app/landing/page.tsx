"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, ShieldCheck, Sparkles, Receipt, ArrowRight, Zap, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "Understands plain English",
    desc: "Say \"I need comfortable running shoes under ₹3,000\" — or \"not that, something cheaper\" — and the agent gets it.",
  },
  {
    icon: Sparkles,
    title: "Recommends & upsells smartly",
    desc: "Ranks 194+ real products by how well they match your request, budget, and preferences. Suggests relevant add-ons.",
  },
  {
    icon: ShieldCheck,
    title: "Your money, your rules",
    desc: "Set a daily limit, transaction cap, and absolute ceiling. The agent can never spend beyond what you've allowed.",
  },
  {
    icon: Lock,
    title: "Approval before every payment",
    desc: "Every payment requires your explicit tap. No surprise charges — ever.",
  },
  {
    icon: Zap,
    title: "Conversational refinement",
    desc: "Didn't like the first pick? Say \"show me another one\" or \"change the budget to 4000\" — no need to start over.",
  },
  {
    icon: Receipt,
    title: "Full audit trail",
    desc: "Every decision the agent makes — search, rank, recommend, pay — is logged with a timestamp you can review.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-texture min-h-dvh" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent)" }}>
            <Bot size={16} style={{ color: "var(--nude)" }} />
          </div>
          <span className="font-display text-lg" style={{ color: "var(--text-hi)" }}>AgentCart</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center sm:px-12 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <span className="inline-block rounded-full border px-4 py-1.5 text-xs font-medium" style={{ borderColor: "var(--rose)", color: "var(--rose)", background: "var(--rose-soft)" }}>
            AI-powered shopping with real guardrails
          </span>
          <h1 className="font-display mt-5 text-4xl leading-tight sm:text-6xl" style={{ color: "var(--text-hi)" }}>
            Shop smarter.<br />
            <span style={{ color: "var(--rose)" }}>Spend safer.</span>
          </h1>
          <p className="mt-6 mx-auto max-w-xl text-lg leading-relaxed" style={{ color: "var(--text-mid)" }}>
            AgentCart is an AI shopping agent that finds what you want, explains its reasoning,
            and only spends money once you say so — bounded by limits you set yourself.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary text-base px-6 py-3">
              Start shopping free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-ghost text-sm px-5 py-3">
              I already have an account
            </Link>
          </div>
        </motion.div>

        {/* Fake chat preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-14 max-w-lg rounded-2xl border p-5 text-left"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full" style={{ background: "var(--rose)" }} />
            <span className="text-xs" style={{ color: "var(--text-lo)" }}>AgentCart · live demo</span>
          </div>
          {[
            { role: "user", text: "I need running shoes under ₹3,000" },
            { role: "agent", text: "Found 12 options — top pick: AeroRun Flex ₹2,499 (92% match). It has the highest comfort score within your budget and it's in stock. Want me to add Performance Socks for ₹299?" },
            { role: "user", text: "not this, something cheaper" },
            { role: "agent", text: "Switched to FeatherRun Mini ₹1,599 — lighter, still solid for casual runs. Total ₹1,598. Approve payment?" },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: m.role === "user" ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className={`mb-2.5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug"
                style={m.role === "user"
                  ? { background: "var(--accent)", color: "var(--nude)" }
                  : { background: "var(--panel-2)", color: "var(--text-hi)" }}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24 sm:px-12">
        <h2 className="font-display text-center text-2xl mb-10" style={{ color: "var(--text-hi)" }}>
          Everything you need, nothing you don't
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="panel-card p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3" style={{ background: "var(--rose-soft)" }}>
                <f.icon size={17} style={{ color: "var(--rose)" }} />
              </div>
              <h3 className="font-medium text-sm mb-1.5" style={{ color: "var(--text-hi)" }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-mid)" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 pb-24 text-center sm:px-12">
        <div className="rounded-2xl border p-10" style={{ background: "var(--accent)", borderColor: "var(--border)" }}>
          <h2 className="font-display text-2xl" style={{ color: "var(--nude)" }}>Ready to shop smarter?</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--rose)" }}>Takes 30 seconds to set up. No credit card needed.</p>
          <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold" style={{ background: "var(--nude)", color: "var(--accent)" }}>
            Create your account <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
