"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Product } from "@/types";
import { inr } from "@/lib/format";

export default function UpsellCard({ product, reason, accepted, onAccept, onSkip }:
  { product: Product; reason: string; accepted: boolean | null; onAccept: () => void; onSkip: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-3.5"
      style={{ borderColor: "var(--rose)", borderStyle: "dashed", background: "var(--rose-soft)" }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--rose)" }}>
        <Sparkles size={13} /><p className="text-xs font-semibold uppercase tracking-wide">Revenue opportunity</p>
      </div>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden flex items-center justify-center text-lg"
          style={{ background: "var(--bg-2)" }}>
          {product.image?.startsWith("http")
            ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
            : product.image}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-hi)" }}>{product.name}</p>
          <p className="font-mono text-sm" style={{ color: "var(--rose)" }}>{inr(product.price)}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-mid)" }}>{reason}</p>
      {accepted === null ? (
        <div className="flex gap-2">
          <button onClick={onAccept} className="btn-primary flex-1 justify-center text-xs py-1.5" style={{ background: "var(--rose)" }}>Add to cart</button>
          <button onClick={onSkip} className="btn-ghost flex-1 justify-center text-xs py-1.5">Skip</button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-lo)" }}>{accepted ? "Added to cart." : "Skipped."}</p>
      )}
    </motion.div>
  );
}
