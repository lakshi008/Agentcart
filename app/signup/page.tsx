"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, ArrowLeft, Loader2, Wallet, ShieldCheck } from "lucide-react";

const STEPS = ["Account", "Wallet", "Limits"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1 fields
  const [walletBalance, setWalletBalance] = useState(25000);
  const [savedMethod, setSavedMethod] = useState("");

  // Step 2 fields
  const [maxTxn, setMaxTxn] = useState(3000);
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [hardCeiling, setHardCeiling] = useState(15000);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function next() {
    setError(null);
    if (step === 0) {
      if (!email.includes("@")) return setError("Enter a valid email.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }
    if (step < 2) setStep((s) => s + 1);
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, name,
          wallet: { balance: walletBalance, savedMethodLabel: savedMethod || null },
          policy: { maxTransactionAmount: maxTxn, dailySpendingLimit: dailyLimit, hardCeiling },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-texture flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent)" }}>
            <Bot size={16} style={{ color: "var(--nude)" }} />
          </div>
          <span className="font-display text-lg" style={{ color: "var(--text-hi)" }}>AgentCart</span>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? "var(--rose)" : "var(--border)" }}
              />
              <p className="mt-1.5 text-[11px]" style={{ color: i <= step ? "var(--rose)" : "var(--text-lo)" }}>{s}</p>
            </div>
          ))}
        </div>

        <div className="panel-card p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <h2 className="font-display text-2xl mb-1" style={{ color: "var(--text-hi)" }}>Create your account</h2>
                <p className="text-sm mb-5" style={{ color: "var(--text-mid)" }}>Takes 30 seconds. No credit card needed.</p>
                <div className="space-y-3">
                  <Field label="Your name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Sharma" className="input" /></Field>
                  <Field label="Email"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input" /></Field>
                  <Field label="Password (min 6 chars)"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" /></Field>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={18} style={{ color: "var(--rose)" }} />
                  <h2 className="font-display text-2xl" style={{ color: "var(--text-hi)" }}>Your wallet</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: "var(--text-mid)" }}>This mock balance is what the agent charges when you approve a payment.</p>
                <div className="space-y-3">
                  <Field label="Starting wallet balance (₹)">
                    <input type="number" min={0} value={walletBalance} onChange={e => setWalletBalance(Number(e.target.value))} className="input" />
                  </Field>
                  <Field label="Saved payment method label (optional)">
                    <input value={savedMethod} onChange={e => setSavedMethod(e.target.value)} placeholder="UPI: you@okbank" className="input" />
                    <p className="mt-1 text-xs" style={{ color: "var(--text-lo)" }}>Just a label — no real card data stored.</p>
                  </Field>
                  <button onClick={() => setWalletBalance(0)} className="btn-ghost text-xs">Skip — start with ₹0</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={18} style={{ color: "var(--rose)" }} />
                  <h2 className="font-display text-2xl" style={{ color: "var(--text-hi)" }}>Spending limits</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: "var(--text-mid)" }}>The agent can never spend beyond what you set here. All editable later in Profile.</p>
                <div className="space-y-3">
                  <Field label="Max per transaction (₹)">
                    <input type="number" min={0} value={maxTxn} onChange={e => setMaxTxn(Number(e.target.value))} className="input" />
                  </Field>
                  <Field label="Daily spending limit (₹)">
                    <input type="number" min={0} value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} className="input" />
                  </Field>
                  <Field label="Absolute ceiling (₹) — never overridable">
                    <input type="number" min={0} value={hardCeiling} onChange={e => setHardCeiling(Number(e.target.value))} className="input" />
                    <p className="mt-1 text-xs" style={{ color: "var(--text-lo)" }}>Not even a manual override can cross this.</p>
                  </Field>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="mt-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>
          )}

          <div className="mt-5 flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {step < 2 ? (
              <button onClick={next} className="btn-primary flex-1">
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={submit} disabled={loading} className="btn-primary flex-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {loading ? "Creating account…" : "Create account"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--text-lo)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--rose)" }} className="hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs" style={{ color: "var(--text-lo)" }}>{label}</span>
      {children}
    </label>
  );
}
