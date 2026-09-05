"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import TopDock from "@/components/TopDock";
import { useUser } from "@/lib/hooks/useUser";
import { inr, timeOnly } from "@/lib/format";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { user } = useUser();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders").then(r => r.json()).then(d => setOrders(d.orders ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh pb-16" style={{ background: "var(--bg)" }}>
      <TopDock user={user} />
      <main className="mx-auto max-w-2xl px-4 pt-8 sm:px-0">
        <h1 className="font-display text-3xl mb-1" style={{ color: "var(--text-hi)" }}>Previous orders</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-mid)" }}>Every payment your agent has made.</p>

        {loading ? (
          <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-lo)" }}>
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : orders.length === 0 ? (
          <p className="mt-10 text-center text-sm" style={{ color: "var(--text-lo)" }}>No orders yet — go chat with the agent.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {o.status === "captured"
                        ? <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                        : <XCircle size={14} style={{ color: "var(--danger)" }} />}
                      <span className="font-mono text-xs" style={{ color: "var(--text-lo)" }}>{o.orderId}</span>
                      {o.overridden && (
                        <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
                          <ShieldAlert size={9} /> override
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-lo)" }}>
                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {timeOnly(o.createdAt)}
                    </p>
                  </div>
                  <span className="font-mono text-lg" style={{ color: "var(--text-hi)" }}>{inr(o.total)}</span>
                </div>
                <div className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  {o.lines.map(l => (
                    <div key={l.productId} className="flex justify-between text-xs" style={{ color: "var(--text-mid)" }}>
                      <span>{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ""}</span>
                      <span className="font-mono">{inr(l.price * l.quantity)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
