"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TopDock from "@/components/TopDock";
import ChatComposer from "@/components/ChatComposer";
import ProductGrid from "@/components/ProductGrid";
import UpsellCard from "@/components/UpsellCard";
import ActivityDrawer from "@/components/ActivityDrawer";
import AuditDrawer from "@/components/AuditDrawer";
import PaymentOverlay, { type PaymentStage } from "@/components/PaymentOverlay";
import { useUser } from "@/lib/hooks/useUser";
import { openRazorpayCheckout, isRazorpayConfigured } from "@/lib/razorpay-checkout";
import type { AgentActivityStep, AgentTurn, AuditEvent, Cart, CartLine, PolicyDecision } from "@/types";
import { inr } from "@/lib/format";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Lock, AlertTriangle, Wallet, User, ShieldCheck as Policy, Star, ArrowRight } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "error" | "question";
  text?: string;
  turn?: AgentTurn;
  upsellDecision?: boolean | null;
  selectedProductId?: string | null;
}

const SUGGESTIONS = [
  "I need comfortable running shoes under ₹3,000",
  "Show me a premium smartphone under ₹40,000",
  "I want a good perfume under ₹5,000",
  "Find me a casual sofa under ₹30,000",
];

export default function Page() {
  return <Suspense><PageInner /></Suspense>;
}

function PageInner() {
  const { user, refresh: refreshUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [auditOpen, setAuditOpen]       = useState(false);
  const [activity, setActivity]         = useState<AgentActivityStep[]>([]);
  const [auditEvents, setAuditEvents]   = useState<AuditEvent[]>([]);

  const [activeCart, setActiveCart] = useState<Cart | null>(null);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [approving, setApproving]   = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);

  const [paymentStage, setPaymentStage] = useState<PaymentStage>("idle");
  const [orderId, setOrderId]           = useState<string | null>(null);
  const [failReason, setFailReason]     = useState<string | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const askedRef   = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    fetch("/api/cart").then(r => r.json()).then(d => {
      if (d.cart?.lines?.length) setActiveCart(d.cart);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ask = searchParams.get("ask");
    if (ask && !askedRef.current) {
      askedRef.current = true;
      handleSend(ask);
      router.replace("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function refreshAudit() {
    const res  = await fetch("/api/audit");
    const data = await res.json();
    setAuditEvents(data.events ?? []);
  }

  async function handleSend(message: string) {
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "user", text: message }]);
    setLoading(true);
      setConfirmOverride(false);
    try {
      const res  = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const turn = await res.json();
      if (!res.ok) {
        const errMsg = turn.error ?? "Could not process that.";
        // Show as a counter-question bubble, not a red error
        setMessages(m => [...m, { id: crypto.randomUUID(), role: "question", text: errMsg }]);
        return;
      }
      setActivity(turn.activity);

      if (turn.mode === "shopping") {
        setActiveCart(turn.cart);
        setPolicyDecision(turn.policy);
      }

      setMessages(m => [...m, {
        id: crypto.randomUUID(),
        role: "agent",
        turn,
        upsellDecision: turn.mode === "shopping" && turn.upsell ? null : undefined,
        selectedProductId: turn.mode === "shopping" ? turn.primary.product.id : null,
      }]);
    } catch {
      setMessages(m => [...m, { id: crypto.randomUUID(), role: "question", text: "Something went wrong on my end. Could you try rephrasing?" }]);
    } finally {
      setLoading(false);
      refreshAudit();
    }
  }

  async function handleProductSelect(msgId: string, productId: string) {
    const msg  = messages.find(m => m.id === msgId);
    if (!msg?.turn || msg.turn.mode !== "shopping") return;
    const scored = msg.turn.ranked.find(r => r.product.id === productId);
    if (!scored) return;

    setMessages(m => m.map(msg2 => msg2.id === msgId ? { ...msg2, selectedProductId: productId } : msg2));

    const primaryLine: CartLine = {
      productId: scored.product.id,
      name:      scored.product.name,
      price:     scored.product.price,
      quantity:  msg.turn!.intent.quantity,
      reason:    "Selected from grid",
      kind:      "primary",
    };
    const upsellLine = msg.upsellDecision === true && msg.turn.upsell
      ? [{ productId: msg.turn.upsell.product.id, name: msg.turn.upsell.product.name,
           price: msg.turn.upsell.product.price, quantity: 1, reason: "Upsell", kind: "upsell" as const }]
      : [];
    const lines = [primaryLine, ...upsellLine];
    const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    const res  = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const data = await res.json();
    setActiveCart(data.cart ?? { lines, total });
    await recheckPolicy(false);
  }

  async function handleUpsellDecision(msgId: string, accept: boolean) {
    setMessages(m => m.map(msg => msg.id === msgId ? { ...msg, upsellDecision: accept } : msg));
    const msg  = messages.find(m => m.id === msgId);
    const turn = msg?.turn;
    if (!turn || turn.mode !== "shopping") return;
    const primary = turn.ranked.find(r => r.product.id === msg.selectedProductId) ?? turn.primary;
    const lines: CartLine[] = [
      { productId: primary.product.id, name: primary.product.name, price: primary.product.price,
        quantity: turn.intent.quantity, reason: "Primary", kind: "primary" },
      ...(accept && turn.upsell
        ? [{ productId: turn.upsell.product.id, name: turn.upsell.product.name,
             price: turn.upsell.product.price, quantity: 1, reason: "Upsell", kind: "upsell" as const }]
        : []),
    ];
    const res  = await fetch("/api/cart", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const data = await res.json();
    setActiveCart(data.cart);
    await recheckPolicy(false);
  }

  async function recheckPolicy(override: boolean) {
    const res  = await fetch("/api/policy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
    });
    const data = await res.json();
    setPolicyDecision(data.decision);
    return data.decision;
  }

  async function handleApprove(overridden: boolean) {
    if (!activeCart) return;
    setApproving(true);
    setPaymentStage("approving");
    setConfirmOverride(false);

    await fetch("/api/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overridden }),
    });
    await sleep(450);

    setPaymentStage("checking-policy");
    const pol = await recheckPolicy(overridden);
    await sleep(450);

    if (!pol.allowed) {
      setPaymentStage("failed");
      setFailReason(pol.reason ?? "Policy check failed.");
      setApproving(false);
      refreshAudit();
      return;
    }

    setPaymentStage("creating-order");
    const orderRes  = await fetch("/api/payment/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override: overridden }),
    });
    const orderData = await orderRes.json();
    await sleep(600);

    if (!orderRes.ok || orderData.blocked || !orderData.order?.success) {
      setPaymentStage("failed");
      setFailReason(orderData.decision?.reason ?? orderData.order?.reason ?? "Order creation failed.");
      setApproving(false);
      refreshAudit();
      return;
    }

    setOrderId(orderData.order.orderId);

    // ── Real Razorpay checkout when key is configured ──────────────────────
    if (isRazorpayConfigured()) {
      setPaymentStage("checkout");
      await openRazorpayCheckout({
        orderId:     orderData.order.orderId,
        amountPaise: orderData.order.amount,
        currency:    orderData.order.currency,
        userName:    user?.name,
        userEmail:   user?.email,
        onSuccess: async (rzData) => {
          setPaymentStage("processing");
          const verRes  = await fetch("/api/payment/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...rzData, overridden: orderData.overridden }),
          });
          const verData = await verRes.json();
          if (verData.success) { setPaymentStage("success"); }
          else { setPaymentStage("failed"); setFailReason(verData.error ?? "Verification failed."); }
          setApproving(false); refreshAudit(); refreshUser();
        },
        onDismiss: () => {
          setPaymentStage("failed");
          setFailReason("Checkout was closed before payment completed.");
          setApproving(false); refreshAudit();
        },
      });
      return; // further state is handled inside onSuccess/onDismiss callbacks
    }

    // ── Mock simulation (no Razorpay key configured) ────────────────────────
    setPaymentStage("checkout");
    await sleep(600);
    setPaymentStage("processing");
    await sleep(900);

    const verifyRes  = await fetch("/api/payment/simulate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderData.order.orderId, outcome: "success", overridden: orderData.overridden }),
    });
    const verifyData = await verifyRes.json();

    if (verifyData.result?.success) { setPaymentStage("success"); }
    else { setPaymentStage("failed"); setFailReason(verifyData.result?.reason ?? "Payment failed."); }

    setApproving(false); refreshAudit(); refreshUser();
  }

  function closeOverlay() {
    const wasSuccess = paymentStage === "success";
    setPaymentStage("idle");
    setOrderId(null);
    setFailReason(null);
    if (wasSuccess) {
      setActiveCart(null);
      setPolicyDecision(null);
        }
  }

  const failedChecks    = policyDecision?.checks.filter(c => c.status === "failed") ?? [];
  const blocked         = failedChecks.length > 0;
  const hardBlocked     = failedChecks.some(c => ["Absolute Ceiling","Stock Availability","Wallet Balance","Payment Attempt Limit"].includes(c.name));
  const softBlocked     = blocked && !hardBlocked;
  const readyToApprove  = policyDecision != null && !blocked;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <TopDock
        user={user}
        activityOpen={activityOpen}
        auditOpen={auditOpen}
        onToggleActivity={() => { setActivityOpen(v => !v); setAuditOpen(false); }}
        onToggleAudit={() => { setAuditOpen(v => !v); setActivityOpen(false); refreshAudit(); }}
      />

      <div className="flex h-[calc(100dvh-57px)]">
        {/* ── Left sidebar: user info + cart/policy ── */}
        <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col border-r gap-4 p-4 overflow-y-auto"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}>

          {user && (
            <div className="panel-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: "var(--accent)", color: "var(--nude)" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-hi)" }}>{user.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-lo)" }}>{user.email}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <InfoRow icon={Wallet} label="Wallet" value={inr(user.wallet.balance)} />
                <InfoRow icon={Policy} label="Daily limit" value={inr(user.policy.dailySpendingLimit)} />
                <InfoRow icon={Star} label="Per transaction" value={inr(user.policy.maxTransactionAmount)} />
              </div>
              {user.wallet.savedMethodLabel && (
                <p className="mt-2 text-xs rounded-lg px-2 py-1.5 border" style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
                  💳 {user.wallet.savedMethodLabel}
                </p>
              )}
            </div>
          )}

          {/* Cart + Policy in sidebar */}
          <AnimatePresence>
            {activeCart && activeCart.lines.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="panel-card p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-lo)" }}>Cart</p>
                <div className="space-y-1.5 mb-3">
                  {activeCart.lines.map(l => (
                    <div key={l.productId} className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-mid)" }}>{l.name} {l.quantity > 1 ? `× ${l.quantity}` : ""}
                        {l.kind === "upsell" && <span className="ml-1 text-[10px] uppercase" style={{ color: "var(--rose)" }}>add-on</span>}
                      </span>
                      <span className="font-mono" style={{ color: "var(--text-hi)" }}>{inr(l.price * l.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--text-hi)" }}>Total</span>
                  <span className="font-mono" style={{ color: "var(--rose)" }}>{inr(activeCart.total)}</span>
                </div>

                {/* Policy checks */}
                {policyDecision && (
                  <div className="mt-3 space-y-1">
                    {policyDecision.checks.map(c => {
                      const Icon = c.status === "passed" ? ShieldCheck : c.status === "failed" ? ShieldAlert : ShieldQuestion;
                      return (
                        <div key={c.name} className="flex items-start gap-1.5 text-xs">
                          <Icon size={11} className="mt-0.5 shrink-0"
                            style={{ color: c.status === "passed" ? "var(--success)" : c.status === "failed" ? "var(--danger)" : "var(--warn)" }} />
                          <span style={{ color: "var(--text-lo)" }}>{c.detail}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Blocked message */}
                {blocked && policyDecision?.reason && (
                  <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
                    <p className="text-xs font-medium" style={{ color: "var(--danger)" }}>Payment blocked</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-mid)" }}>{policyDecision.reason}</p>
                    {softBlocked && !confirmOverride && (
                      <button onClick={() => setConfirmOverride(true)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: "var(--warn)" }}>
                        <AlertTriangle size={12} /> Override limit?
                      </button>
                    )}
                    {softBlocked && confirmOverride && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs" style={{ color: "var(--warn)" }}>This exceeds your normal limit but is within your ceiling.</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleApprove(true)} disabled={approving}
                            className="flex-1 rounded-lg py-1.5 text-xs font-semibold"
                            style={{ background: "var(--warn)", color: "#fff" }}>
                            {approving ? "Processing…" : "Override & pay"}
                          </button>
                          <button onClick={() => setConfirmOverride(false)}
                            className="flex-1 rounded-lg border py-1.5 text-xs"
                            style={{ borderColor: "var(--border)", color: "var(--text-mid)" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Approve button */}
                {readyToApprove && (
                  <button
                    onClick={() => handleApprove(false)}
                    disabled={approving}
                    className="btn-primary mt-3 w-full justify-center"
                    style={{ background: "var(--accent)" }}
                  >
                    <Lock size={13} />
                    {approving ? "Processing…" : `Approve & Pay ${inr(activeCart.total)}`}
                  </button>
                )}

                {!policyDecision && (
                  <button onClick={() => recheckPolicy(false)} className="btn-ghost mt-3 w-full justify-center text-xs">
                    Check payment eligibility
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick suggestions */}
          {messages.length === 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-lo)" }}>Try asking</p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl border transition"
                    style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "var(--bg-2)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Right: chat area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            {messages.length === 0 && <HeroPrompt name={user?.name} onPick={handleSend} />}
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map(msg => (
                <MsgRow key={msg.id} msg={msg}
                  onProductSelect={(pid) => handleProductSelect(msg.id, pid)}
                  onUpsellDecision={(accept) => handleUpsellDecision(msg.id, accept)} />
              ))}
              {loading && <ThinkingBubble />}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t px-4 py-3 sm:px-8"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <div className="max-w-3xl mx-auto">
              <ChatComposer onSend={handleSend} disabled={loading} />
              <p className="mt-2 text-center text-xs" style={{ color: "var(--text-lo)" }}>
                Try "not this, another one" or "something cheaper" after a recommendation
              </p>
            </div>
          </div>
        </main>
      </div>

      <ActivityDrawer open={activityOpen} onClose={() => setActivityOpen(false)} steps={activity} />
      <AuditDrawer    open={auditOpen}    onClose={() => setAuditOpen(false)}    events={auditEvents} />
      <PaymentOverlay stage={paymentStage} amount={activeCart?.total ?? 0} orderId={orderId} failReason={failReason} onClose={closeOverlay} />
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-lo)" }}>
        <Icon size={11} /> {label}
      </span>
      <span className="font-mono" style={{ color: "var(--text-hi)" }}>{value}</span>
    </div>
  );
}

function HeroPrompt({ name, onPick }: { name?: string; onPick: (s: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto mb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-lo)" }}>AI Shopping Agent</p>
        <h1 className="font-display text-3xl sm:text-4xl mb-2" style={{ color: "var(--text-hi)" }}>
          {name ? `Hey ${name.split(" ")[0]}!` : "What are you"} <span style={{ color: "var(--rose)" }}>looking for?</span>
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-mid)" }}>
          I search 194+ products, explain my picks, and only spend money after you approve.
          Say things like &quot;not this&quot; or &quot;something cheaper&quot; to refine.
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => onPick(s)}
              className="rounded-full border text-xs px-3.5 py-2 flex items-center gap-1.5 transition"
              style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "var(--panel)" }}>
              {s} <ArrowRight size={11} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function MsgRow({ msg, onProductSelect, onUpsellDecision }: {
  msg: ChatMessage;
  onProductSelect: (id: string) => void;
  onUpsellDecision: (accept: boolean) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm"
          style={{ background: "var(--accent)", color: "var(--nude)" }}>
          {msg.text}
        </motion.div>
      </div>
    );
  }

  if (msg.role === "question") {
    return (
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-2.5">
        <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          <User size={13} />
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm"
          style={{ background: "var(--panel)", color: "var(--text-hi)", border: "1px solid var(--border)" }}>
          {msg.text}
        </div>
      </motion.div>
    );
  }

  if (msg.role === "error") {
    return (
      <div className="rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}>
        {msg.text}
      </div>
    );
  }

  // Agent message with turn
  const turn = msg.turn!;

  if (turn.mode === "info") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center mt-0.5"
            style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            <User size={13} />
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm"
            style={{ background: "var(--panel)", color: "var(--text-hi)", border: "1px solid var(--border)" }}>
            {turn.text}
          </div>
        </div>

        {turn.product && (
          <div className="ml-9 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg-2)", color: "var(--text-mid)" }}>
            {turn.product.image ? <span className="text-base">{turn.product.image}</span> : null}
            <span className="font-medium" style={{ color: "var(--text-hi)" }}>{turn.product.name}</span>
            {turn.product.price > 0 ? <span>· {inr(turn.product.price)}</span> : null}
            {turn.product.rating > 0 ? <span>· ★ {turn.product.rating}</span> : null}
            {typeof turn.product.attributes.source === "string" ? <span>· real product data</span> : null}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Explanation bubble */}
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          <User size={13} />
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm"
          style={{ background: "var(--panel)", color: "var(--text-hi)", border: "1px solid var(--border)" }}>
          {turn.explanation}
        </div>
      </div>

      <div className="ml-9">
        <ProductGrid
          products={turn.ranked.slice(0, 6)}
          selectedId={msg.selectedProductId ?? null}
          onSelect={onProductSelect}
        />
      </div>

      {turn.upsell && (
        <div className="ml-9">
          <UpsellCard
            product={turn.upsell.product}
            reason={turn.upsell.reason}
            accepted={msg.upsellDecision ?? null}
            onAccept={() => onUpsellDecision(true)}
            onSkip={() => onUpsellDecision(false)}
          />
        </div>
      )}

      <p className="ml-9 text-xs" style={{ color: "var(--text-lo)" }}>
        Proposed total {inr(turn.cart.total)} — check the sidebar to approve.
      </p>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center"
        style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
        <User size={13} />
      </div>
      <div className="flex gap-1 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="h-1.5 w-1.5 rounded-full animate-bounce"
            style={{ background: "var(--rose)", animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );
}
