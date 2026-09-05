import type { Product, ScoredProduct, StructuredIntent } from "@/types";
import { searchCatalog, getProductsByIds } from "@/lib/catalog";

/**
 * Ranking is ONLY performed after hard retrieval constraints have been applied.
 * A product that is not the requested type, category, budget, or in stock is
 * never scored as a "near miss". This is the key guardrail that prevents a
 * request such as "running shoes under ₹3,000" from selecting a polo shirt.
 */
export function rankProducts(intent: StructuredIntent): ScoredProduct[] {
  const candidates = searchCatalog(intent);

  const scored = candidates.map((product) => scoreProduct(product, intent));
  return scored.sort((a, b) => b.score - a.score);
}

function scoreProduct(product: Product, intent: StructuredIntent): ScoredProduct {
  const breakdown: ScoredProduct["breakdown"] = [];

  const categoryPts = intent.category ? 25 : 20;
  breakdown.push({ label: "Category Match", points: categoryPts, max: 25 });

  const typePts = intent.productType ? 25 : 20;
  breakdown.push({ label: "Product Type", points: typePts, max: 25 });

  const budgetPts = intent.budget == null || product.price <= intent.budget ? 20 : 0;
  breakdown.push({ label: "Within Budget", points: budgetPts, max: 20 });

  const prefPts = scorePreferences(product, intent.preferences);
  breakdown.push({ label: "Preference Match", points: prefPts, max: 20 });

  const ratingPts = Math.round((product.rating / 5) * 5);
  breakdown.push({ label: "Rating", points: ratingPts, max: 5 });

  const stockPts = product.stock > 0 ? 5 : 0;
  breakdown.push({ label: "Stock Availability", points: stockPts, max: 5 });

  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  const max = breakdown.reduce((sum, b) => sum + b.max, 0);
  const score = Math.round((total / max) * 100);
  return { product, score, breakdown };
}

function scorePreferences(product: Product, preferences: string[]): number {
  if (preferences.length === 0) return 14;

  const quality = Number(product.attributes.quality ?? product.attributes.comfort ?? product.rating * 2);
  const durability = Number(product.attributes.durability ?? quality);
  const text = `${product.name} ${product.description} ${product.category} ${Object.entries(product.attributes).map(([k, v]) => `${k} ${v}`).join(" ")}`.toLowerCase();

  let hits = 0;
  for (const pref of preferences) {
    const p = pref.toLowerCase();
    if ((p.includes("comfort") || p.includes("support") || p.includes("quality")) && quality >= 7) hits++;
    else if (p.includes("durab") && durability >= 7) hits++;
    else if ((p.includes("light") || p.includes("portable")) && quality >= 6) hits++;
    else if (p.includes("run") && text.includes("run")) hits++;
    else if ((p.includes("cheap") || p.includes("afford") || p.includes("budget")) && product.price <= 2000) hits++;
    else if ((p.includes("premium") || p.includes("expensive") || p.includes("high quality")) && product.price >= 3000) hits++;
    else if (text.includes(p)) hits++;
  }

  return Math.round((hits / preferences.length) * 20);
}

export function explainSelection(best: ScoredProduct, intent: StructuredIntent): string {
  const reasons: string[] = [];
  const topFactor = [...best.breakdown].sort((a, b) => b.points / b.max - a.points / a.max)[0];

  if (topFactor.label === "Preference Match" && intent.preferences.length) {
    reasons.push(`matches your ${intent.preferences.join(", ")} preference`);
  }
  reasons.push(`has a ${best.product.rating}★ seller/product rating`);
  if (best.product.stock > 0) reasons.push("is currently available");

  let explanation = `I selected ${best.product.name} because it ${reasons.slice(0, 3).join(", ")}.`;
  if (intent.budget != null) {
    explanation += ` It is within your ₹${intent.budget.toLocaleString("en-IN")} budget.`;
  }
  return explanation;
}

export function findUpsell(primary: Product, intent: StructuredIntent): { product: Product; reason: string } | null {
  const related = getProductsByIds(primary.relatedProducts).filter((p) => p.stock > 0);
  if (related.length === 0) return null;
  const remainingBudget = intent.budget != null ? Math.max(0, intent.budget - primary.price) : Infinity;
  const affordable = related.filter((p) => p.price <= remainingBudget || intent.budget == null);
  // Never add an upsell that makes the proposed cart exceed the shopper's
  // stated budget. Budget is a hard shopping constraint, not a score.
  if (affordable.length === 0) return null;
  const ranked = [...affordable].sort((a, b) => (b.rating * 20 - b.price / 100) - (a.rating * 20 - a.price / 100));
  const pick = ranked[0];
  return { product: pick, reason: buildUpsellReason(primary, pick) };
}

function buildUpsellReason(primary: Product, upsell: Product): string {
  if (upsell.category === primary.category) return `Another relevant pick in ${primary.category.toLowerCase()}.`;
  if (String(upsell.attributes.brand ?? "") === String(primary.attributes.brand ?? "") && primary.attributes.brand) {
    return `Same brand as ${primary.name}.`;
  }
  return `Relevant alongside ${primary.name}.`;
}
