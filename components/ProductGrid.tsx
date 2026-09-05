"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Boxes, ChevronDown, ChevronUp, CircleCheck, ShoppingCart } from "lucide-react";
import type { ScoredProduct } from "@/types";
import { inr } from "@/lib/format";

export default function ProductGrid({
  products,
  selectedId,
  onSelect,
}: {
  products: ScoredProduct[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(products[0]?.product.id ?? null);

  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: "var(--text-lo)" }}>
        {products.length} option{products.length !== 1 ? "s" : ""} found — click to expand
      </p>
      {products.slice(0, 6).map((scored, i) => {
        const p = scored.product;
        const isExpanded = expandedId === p.id;
        const isSelected = selectedId === p.id;

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border overflow-hidden cursor-pointer transition-all"
            style={{
              borderColor: isSelected ? "var(--rose)" : isExpanded ? "var(--border)" : "var(--border)",
              background: isSelected ? "var(--rose-soft)" : "var(--panel)",
            }}
          >
            {/* Collapsed row */}
            <button
              className="w-full flex items-center gap-3 p-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : p.id)}
            >
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden flex items-center justify-center text-xl"
                style={{ background: "var(--bg-2)" }}>
                {p.image?.startsWith("http")
                  ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  : p.image}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-hi)" }}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs" style={{ color: "var(--rose)" }}>{inr(p.price)}</span>
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--text-lo)" }}>
                    <Star size={10} fill="currentColor" style={{ color: "var(--warn)" }} /> {p.rating}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-lo)" }}>{scored.score}% match</span>
                </div>
              </div>
              <div className="shrink-0 text-xs" style={{ color: "var(--text-lo)" }}>
                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex gap-3 pt-3">
                      {p.image?.startsWith("http") && (
                        <img src={p.image} alt={p.name} className="h-20 w-20 rounded-lg object-cover shrink-0" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-mid)" }}>{p.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
                            <Boxes size={10} className="inline mr-1" />{p.stock} in stock
                          </span>
                          {p.stock === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>Out of stock</span>
                          )}
                          {scored.breakdown.filter(b => b.points / b.max >= 0.7).slice(0, 2).map(b => (
                            <span key={b.label} className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
                              <CircleCheck size={10} style={{ color: "var(--success)" }} />{b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {scored.breakdown.map(b => (
                        <div key={b.label} className="flex items-center justify-between text-xs">
                          <span style={{ color: "var(--text-lo)" }}>{b.label}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
                              <div className="h-full rounded-full" style={{ width: `${(b.points / b.max) * 100}%`, background: "var(--rose)" }} />
                            </div>
                            <span style={{ color: "var(--text-mid)" }}>{b.points}/{b.max}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onSelect(p.id)}
                      disabled={p.stock === 0}
                      className="btn-primary mt-3 w-full justify-center text-xs py-2"
                      style={{ opacity: p.stock === 0 ? 0.4 : 1 }}
                    >
                      <ShoppingCart size={13} />
                      {isSelected ? "Selected" : "Select this product"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
