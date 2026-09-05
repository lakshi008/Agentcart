"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next   = params.get("next") || "/";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-texture flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent)" }}>
            <Bot size={16} style={{ color: "var(--nude)" }} />
          </div>
          <span className="font-display text-lg" style={{ color: "var(--text-hi)" }}>AgentCart</span>
        </div>

        <div className="panel-card p-6">
          <h1 className="font-display text-2xl mb-1" style={{ color: "var(--text-hi)" }}>Welcome back</h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-mid)" }}>Sign in to continue with your agent.</p>

          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
            </Field>
            <Field label="Password">
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" />
            </Field>

            {error && (
              <p className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--text-lo)" }}>
          New here? <Link href="/signup" style={{ color: "var(--rose)" }} className="hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs" style={{ color: "var(--text-lo)" }}>{label}</span>
      {children}
    </label>
  );
}
