"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ShieldCheck, CreditCard, PlusCircle, Save, Loader2, ExternalLink } from "lucide-react";
import TopDock from "@/components/TopDock";
import { useUser } from "@/lib/hooks/useUser";
import { inr } from "@/lib/format";

export default function ProfilePage() {
  const { user, loading, refresh } = useUser();

  const [name, setName] = useState("");
  const [maxTxn,    setMaxTxn]    = useState(3000);
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [maxQty,    setMaxQty]    = useState(2);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [hardCeiling, setHardCeiling] = useState(15000);

  const [topUp,   setTopUp]   = useState(1000);
  const [method,  setMethod]  = useState("");

  const [savingPolicy, setSavingPolicy] = useState(false);
  const [toast, setToast] = useState<string|null>(null);

  useEffect(() => {
    if (!user) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(user.name);
    setMaxTxn(user.policy.maxTransactionAmount);
    setDailyLimit(user.policy.dailySpendingLimit);
    setMaxQty(user.policy.maxQuantityPerItem);
    setMaxAttempts(user.policy.maxPaymentAttempts);
    setHardCeiling(user.policy.hardCeiling);
    setMethod(user.wallet.savedMethodLabel ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function savePolicy() {
    setSavingPolicy(true);
    await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, policy: { maxTransactionAmount: maxTxn, dailySpendingLimit: dailyLimit, maxQuantityPerItem: maxQty, maxPaymentAttempts: maxAttempts, hardCeiling } }),
    });
    await refresh();
    setSavingPolicy(false);
    flash("Settings saved.");
  }

  async function saveWallet() {
    await fetch("/api/settings/wallet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topUp, savedMethodLabel: method }),
    });
    setTopUp(0);
    await refresh();
    flash("Wallet updated.");
  }

  if (loading || !user) return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <TopDock user={user} />
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-lo)" }}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    </div>
  );

  const razorpayConfigured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  return (
    <div className="min-h-dvh pb-16" style={{ background: "var(--bg)" }}>
      <TopDock user={user} />
      <main className="mx-auto max-w-2xl px-4 pt-8 sm:px-0">
        <h1 className="font-display text-3xl mb-1" style={{ color: "var(--text-hi)" }}>Profile & Settings</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-mid)" }}>
          Manage your wallet, spending limits, and payment method here — no config files to edit.
        </p>

        {/* Wallet */}
        <Section icon={Wallet} title="Wallet">
          <div className="mb-4 flex items-baseline justify-between rounded-xl border px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}>
            <span className="text-xs" style={{ color: "var(--text-lo)" }}>Current balance</span>
            <span className="font-mono text-xl" style={{ color: "var(--text-hi)" }}>{inr(user.wallet.balance)}</span>
          </div>
          <Field label="Saved payment method (label)">
            <input value={method} onChange={e => setMethod(e.target.value)} placeholder="UPI: you@okbank" className="input" />
            <p className="mt-1 text-xs" style={{ color: "var(--text-lo)" }}>Just a display label — no real card data stored here.</p>
          </Field>
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <Field label="Top up wallet (₹)">
                <input type="number" min={0} value={topUp} onChange={e => setTopUp(Number(e.target.value))} className="input" />
              </Field>
            </div>
            <button onClick={saveWallet} className="btn-primary flex items-center gap-1.5">
              <PlusCircle size={13} /> Add
            </button>
          </div>
        </Section>

        {/* Razorpay */}
        <Section icon={CreditCard} title="Razorpay integration">
          <div className="mb-3 rounded-xl border px-4 py-3" style={{
            borderColor: razorpayConfigured ? "var(--success)" : "var(--border)",
            background:  razorpayConfigured ? "var(--success-soft)" : "var(--bg-2)",
          }}>
            <p className="text-sm font-medium mb-0.5" style={{ color: razorpayConfigured ? "var(--success)" : "var(--text-mid)" }}>
              {razorpayConfigured ? "✓ Razorpay Test Mode connected" : "Razorpay not configured — using mock payments"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-lo)" }}>
              {razorpayConfigured
                ? "Real checkout.js opens when you approve a payment."
                : "Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local to enable real payments."}
            </p>
          </div>
          <div className="rounded-xl border p-4 text-xs space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}>
            <p className="font-medium" style={{ color: "var(--text-hi)" }}>To enable real Razorpay Test Mode:</p>
            <ol className="list-decimal pl-4 space-y-1" style={{ color: "var(--text-mid)" }}>
              <li>Go to <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--rose)" }}>dashboard.razorpay.com <ExternalLink size={10} className="inline" /></a> → Settings → API Keys → Generate Test Key</li>
              <li>Add these to your <code className="rounded px-1" style={{ background: "var(--panel)" }}>.env.local</code>:
                <pre className="mt-1 rounded-lg p-2 text-[11px] overflow-x-auto" style={{ background: "var(--panel)", color: "var(--nude)" }}>{`RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...`}</pre>
              </li>
              <li>Restart <code className="rounded px-1" style={{ background: "var(--panel)" }}>npm run dev</code></li>
              <li>The real Razorpay checkout modal opens automatically on payment approval.</li>
            </ol>
          </div>
        </Section>

        {/* Spending limits */}
        <Section icon={ShieldCheck} title="Spending guardrails">
          <p className="text-xs mb-4" style={{ color: "var(--text-lo)" }}>
            The agent can never spend beyond these limits. The absolute ceiling can't be crossed even with a manual override.
          </p>
          <Field label="Your name">
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </Field>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumField label="Max per transaction (₹)" value={maxTxn} onChange={setMaxTxn} />
            <NumField label="Daily spending limit (₹)" value={dailyLimit} onChange={setDailyLimit} />
            <NumField label="Max quantity per item" value={maxQty} onChange={setMaxQty} />
            <NumField label="Max payment attempts" value={maxAttempts} onChange={setMaxAttempts} />
          </div>
          <div className="mt-3">
            <NumField label="Absolute ceiling (₹) — never overridable" value={hardCeiling} onChange={setHardCeiling} />
          </div>
          <button onClick={savePolicy} disabled={savingPolicy} className="btn-primary mt-4 flex items-center gap-1.5">
            {savingPolicy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save settings
          </button>
        </Section>
      </main>

      {toast && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border px-4 py-2 text-xs"
          style={{ borderColor: "var(--success)", background: "var(--success-soft)", color: "var(--success)" }}>
          {toast}
        </motion.div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}>
      <div className="mb-4 flex items-center gap-2">
        <Icon size={15} style={{ color: "var(--rose)" }} />
        <h2 className="font-display text-lg" style={{ color: "var(--text-hi)" }}>{title}</h2>
      </div>
      {children}
    </motion.section>
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" min={0} value={value} onChange={e => onChange(Number(e.target.value))} className="input" />
    </Field>
  );
}
