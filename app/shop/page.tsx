"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Star, ShoppingCart, MessageSquareText, Loader2 } from "lucide-react";
import TopDock from "@/components/TopDock";
import { useUser } from "@/lib/hooks/useUser";
import { inr } from "@/lib/format";
import type { Product } from "@/types";

const PAGE_SIZE = 40;

export default function ShopPage() {
  const { user } = useUser();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<"relevance"|"price-asc"|"price-desc"|"rating">("relevance");
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [addingId, setAddingId] = useState<string|null>(null);

  async function load(reset = true) {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const offset = reset ? 0 : products.length;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (query.trim()) params.set("q", query.trim());
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/catalog?${params.toString()}`);
      const data = await res.json();
      setProducts((prev) => reset ? (data.products ?? []) : [...prev, ...(data.products ?? [])]);
      setTotal(Number(data.total ?? 0));
      setHasMore(Boolean(data.hasMore));
      if (Array.isArray(data.categories)) setCategories(data.categories);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { const t = setTimeout(() => { void load(true); }, 250); return () => clearTimeout(t); }, [query, category]);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sort === "price-asc") list.sort((a,b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a,b) => b.price - a.price);
    if (sort === "rating") list.sort((a,b) => b.rating - a.rating);
    return list;
  }, [products, sort]);

  async function buyNow(p: Product) {
    setAddingId(p.id);
    await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: [{ productId: p.id, name: p.name, price: p.price, quantity: 1, reason: "Added from Shop.", kind: "primary" }] }) });
    setAddingId(null);
    router.push("/");
  }

  const selStyle = { background: "var(--bg-2)", borderColor: "var(--border)", color: "var(--text-hi)" };
  return (
    <div className="min-h-dvh pb-16" style={{ background: "var(--bg)" }}>
      <TopDock user={user} />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: "var(--text-hi)" }}>Browse catalog</h1>
        <p className="text-sm mb-5" style={{ color: "var(--text-mid)" }}>Amazon Products Dataset 2023 catalog. Product metadata, prices, ratings and images come from the Kaggle dataset; stock is a deterministic demo value because the dataset is not live inventory.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <Search size={14} style={{ color: "var(--text-lo)" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: "var(--text-hi)" }} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" style={selStyle}><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-xl border px-3 py-2.5 text-sm" style={selStyle}>
            <option value="relevance">Relevance</option><option value="price-asc">Price: low → high</option><option value="price-desc">Price: high → low</option><option value="rating">Top rated</option>
          </select>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-lo)" }}>{total.toLocaleString("en-IN")} products{total > products.length ? ` · showing ${products.length}` : ""}</p>
        {loading ? <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-lo)" }}><Loader2 className="animate-spin" size={20} /></div> : sorted.length === 0 ? <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--text-mid)" }}>No products found. Try a broader search.</div> : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sorted.map((p, i) => <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.2) }} className="flex flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <div className="flex h-28 items-center justify-center overflow-hidden" style={{ background: "var(--bg-2)" }}>{p.image?.startsWith("http") ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="text-3xl">{p.image}</span>}</div>
                <div className="flex flex-1 flex-col p-3"><p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--text-lo)" }}>{p.category}</p><p className="text-xs font-medium line-clamp-2 flex-1 mb-2" style={{ color: "var(--text-hi)" }}>{p.name}</p><div className="flex items-center justify-between mb-2"><span className="font-mono text-sm" style={{ color: "var(--rose)" }}>{inr(p.price)}</span><span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--text-lo)" }}><Star size={10} fill="currentColor" style={{ color: "var(--warn)" }} />{p.rating}</span></div><div className="flex gap-1"><button onClick={() => router.push(`/?ask=${encodeURIComponent("Tell me about " + p.name)}`)} className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] transition" style={{ borderColor: "var(--border)", color: "var(--text-mid)" }}><MessageSquareText size={10} /> Ask</button><button onClick={() => buyNow(p)} disabled={p.stock === 0 || addingId === p.id} className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--nude)" }}>{addingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <ShoppingCart size={10} />}{p.stock === 0 ? "OOS" : "Buy"}</button></div></div>
              </motion.div>)}
            </div>
            {hasMore && <div className="mt-6 flex justify-center"><button onClick={() => load(false)} disabled={loadingMore} className="rounded-xl border px-5 py-2.5 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-mid)", background: "var(--panel)" }}>{loadingMore ? "Loading…" : "Load more"}</button></div>}
          </>
        )}
      </main>
    </div>
  );
}
