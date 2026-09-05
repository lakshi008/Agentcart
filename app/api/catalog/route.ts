import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "All";
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const requestedLimit = Math.max(1, Number(url.searchParams.get("limit") ?? 40) || 40);
  const limit = Math.min(requestedLimit, 100);

  // Never send the entire (potentially hundreds-of-MB) Kaggle catalog to the browser.
  // Filtering/pagination happens server-side so Shop stays fast.
  const catalog = getCatalog();
  let filtered = catalog;
  if (category && category !== "All") filtered = filtered.filter((p) => p.category === category);
  if (q) {
    filtered = filtered.filter((p) =>
      `${p.name} ${p.description} ${p.category} ${Object.values(p.attributes ?? {}).join(" ")}`.toLowerCase().includes(q)
    );
  }

  const products = filtered.slice(offset, offset + limit);
  const categories = Array.from(new Set(catalog.map((p) => p.category))).sort();
  return NextResponse.json({
    products,
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + products.length < filtered.length,
    categories,
    source: "Kaggle Amazon Products Dataset 2023",
  });
}
