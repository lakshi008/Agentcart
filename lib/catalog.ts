import products from "@/data/products.json";
import type { Product, StructuredIntent } from "@/types";

/** Kaggle Amazon catalog. Run `npm run fetch-kaggle` to populate it. */
export const CATALOG: Product[] = products as unknown as Product[];

function norm(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function textFor(product: Product): string {
  return norm([
    product.name,
    product.category,
    product.description,
    product.attributes.brand,
    product.attributes.productType,
    product.attributes.categoryPath,
    product.attributes.keywords,
    product.attributes.material,
    product.attributes.color,
    product.attributes.model,
  ].join(" "));
}

export function getCatalog(): Product[] { return CATALOG; }
export function getProductById(id: string): Product | null { return CATALOG.find((p) => p.id === id) ?? null; }
export function getProductsByIds(ids: string[]): Product[] {
  const set = new Set(ids);
  return CATALOG.filter((p) => set.has(p.id));
}

export function textSearch(query: string): Product[] {
  const terms = norm(query).split(/\s+/).filter((x) => x.length >= 2);
  if (!terms.length) return [];
  return CATALOG
    .map((product) => {
      const hay = textFor(product);
      const hits = terms.filter((t) => hay.includes(t)).length;
      return { product, score: hits / terms.length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.product);
}

function matchesHardConstraint(product: Product, intent: StructuredIntent): boolean {
  const hay = textFor(product);

  // Price and availability are hard constraints for shopping requests.
  if (intent.budget != null && product.price > intent.budget) return false;
  if (product.stock <= 0) return false;

  // Specific product type is never allowed to degrade into a generic category.
  if (intent.productType) {
    const type = norm(intent.productType);
    const typeWords = type.split(/\s+/).filter(Boolean);
    const directType = norm(product.attributes.productType);
    const categoryPath = norm(product.attributes.categoryPath);

    const allTypeWords = typeWords.every((word) => hay.includes(word) || directType.includes(word) || categoryPath.includes(word));
    if (!allTypeWords) return false;
  }

  // Deterministic required terms are hard constraints, but allow category-path
  // matches because the dataset title and product type don't always repeat every word.
  for (const term of intent.requiredTerms) {
    const t = norm(term);
    if (!t) continue;
    if (!hay.includes(t)) return false;
  }

  if (intent.category) {
    const cat = norm(intent.category);
    const aliases: Record<string, string[]> = {
      shoes: ["shoe", "footwear", "running", "sneaker", "boot"],
      smartphones: ["phone", "smartphone", "mobile"],
      laptops: ["laptop", "notebook", "computer"],
      tablets: ["tablet", "ipad"],
      audio: ["headphone", "earbud", "earphone", "headset"],
      clothing: ["shirt", "dress", "jean", "jacket", "clothing", "apparel"],
      furniture: ["sofa", "chair", "desk", "table", "bed", "furniture"],
      beauty: ["beauty", "skin", "cosmetic", "makeup", "fragrance"],
      appliances: ["appliance", "refrigerator", "washing", "washer"],
      kitchen: ["kitchen", "blender", "mixer", "cookware"],
      sports: ["sport", "running", "fitness", "bike", "weight"],
      watches: ["watch"],
      cameras: ["camera", "dslr", "mirrorless"],
      tv: ["tv", "television"],
      computers: ["computer", "laptop", "monitor", "keyboard", "mouse"],
      home: ["home", "vacuum", "household"],
      toys: ["toy", "game", "doll", "lego"],
      bags: ["bag", "backpack", "luggage"],
      fragrances: ["fragrance", "perfume", "cologne"],
    };
    const allowed = aliases[cat] ?? [cat];
    if (!allowed.some((term) => hay.includes(term))) return false;
  }

  return true;
}

/** Retrieve only products that satisfy hard constraints; ranking happens later. */
export function searchCatalog(intent: StructuredIntent): Product[] {
  return CATALOG.filter((product) => matchesHardConstraint(product, intent));
}

export function findCatalogProduct(query: string): Product | null {
  const q = norm(query);
  if (!q) return null;
  const exact = CATALOG.find((p) => norm(p.name) === q);
  if (exact) return exact;

  const qTokens = q.split(/\s+/).filter((t) => t.length >= 2);
  let best: { product: Product; score: number } | null = null;
  for (const product of CATALOG) {
    const hay = textFor(product);
    const hits = qTokens.filter((t) => hay.includes(t)).length;
    const score = hits / Math.max(1, qTokens.length);
    if (!best || score > best.score) best = { product, score };
  }
  return best && best.score >= Math.min(0.5, 1 / Math.max(1, qTokens.length)) ? best.product : null;
}

export async function ensureLiveCommerceProducts(_intent: StructuredIntent): Promise<{ source: string; count: number }> {
  return { source: "kaggle-amazon", count: CATALOG.length };
}

export async function hydrateCatalogFromApis(): Promise<void> {
  // Deliberately no-op. AgentCart uses the normalized Kaggle catalog only.
}
