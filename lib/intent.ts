import type { StructuredIntent } from "@/types";

/**
 * Product taxonomy used for HARD retrieval constraints. These are deliberately
 * broader than any one merchant's category names so the same intent works for
 * the bundled catalog and live marketplace listings.
 */
const PRODUCT_TYPE_RULES: Array<{ pattern: RegExp; productType: string; category: string; terms: string[] }> = [
  { pattern: /\brunning\s+shoes?\b/, productType: "running shoes", category: "shoes", terms: ["running", "shoe"] },
  { pattern: /\b(?:sneakers?|trainers?)\b/, productType: "sneakers", category: "shoes", terms: ["sneaker"] },
  { pattern: /\b(?:boots?|ankle boots?)\b/, productType: "boots", category: "shoes", terms: ["boot"] },
  { pattern: /\b(?:shoes?|footwear)\b/, productType: "shoes", category: "shoes", terms: ["shoe"] },
  { pattern: /\b(?:smartphones?|cellphones?|mobile phones?|mobiles?|phones?)\b/, productType: "smartphone", category: "smartphones", terms: ["phone"] },
  { pattern: /\b(?:laptops?|notebooks?)\b/, productType: "laptop", category: "laptops", terms: ["laptop"] },
  { pattern: /\b(?:tablets?|ipad)\b/, productType: "tablet", category: "tablets", terms: ["tablet"] },
  { pattern: /\b(?:headphones?|headsets?)\b/, productType: "headphones", category: "audio", terms: ["headphone"] },
  { pattern: /\b(?:earbuds?|earphones?)\b/, productType: "earbuds", category: "audio", terms: ["earbud"] },
  { pattern: /\b(?:smartwatches?|watches?)\b/, productType: "watch", category: "watches", terms: ["watch"] },
  { pattern: /\b(?:cameras?|dslr|mirrorless)\b/, productType: "camera", category: "cameras", terms: ["camera"] },
  { pattern: /\b(?:televisions?|tvs?|smart tvs?)\b/, productType: "television", category: "tv", terms: ["tv"] },
  { pattern: /\b(?:monitors?|displays?)\b/, productType: "monitor", category: "computers", terms: ["monitor"] },
  { pattern: /\b(?:keyboards?)\b/, productType: "keyboard", category: "computers", terms: ["keyboard"] },
  { pattern: /\b(?:mice|mouse)\b/, productType: "mouse", category: "computers", terms: ["mouse"] },
  { pattern: /\b(?:shirts?|t\s*-?shirts?|tees?)\b/, productType: "shirt", category: "clothing", terms: ["shirt"] },
  { pattern: /\b(?:jeans?)\b/, productType: "jeans", category: "clothing", terms: ["jean"] },
  { pattern: /\b(?:dresses?)\b/, productType: "dress", category: "clothing", terms: ["dress"] },
  { pattern: /\b(?:jackets?|coats?)\b/, productType: "jacket", category: "clothing", terms: ["jacket"] },
  { pattern: /\b(?:bags?|backpacks?|rucksacks?)\b/, productType: "bag", category: "bags", terms: ["bag"] },
  { pattern: /\b(?:perfumes?|colognes?|fragrances?|scents?)\b/, productType: "fragrance", category: "fragrances", terms: ["fragrance"] },
  { pattern: /\b(?:sofas?|couches?)\b/, productType: "sofa", category: "furniture", terms: ["sofa"] },
  { pattern: /\b(?:chairs?|office chairs?)\b/, productType: "chair", category: "furniture", terms: ["chair"] },
  { pattern: /\b(?:desks?|tables?)\b/, productType: "desk", category: "furniture", terms: ["desk"] },
  { pattern: /\b(?:beds?|mattresses?)\b/, productType: "bed", category: "furniture", terms: ["bed"] },
  { pattern: /\b(?:vacuum cleaners?|vacuums?)\b/, productType: "vacuum cleaner", category: "home", terms: ["vacuum"] },
  { pattern: /\b(?:blenders?|mixers?)\b/, productType: "blender", category: "kitchen", terms: ["blender"] },
  { pattern: /\b(?:refrigerators?|fridges?)\b/, productType: "refrigerator", category: "appliances", terms: ["refrigerator"] },
  { pattern: /\b(?:washing machines?|washers?)\b/, productType: "washing machine", category: "appliances", terms: ["washing", "machine"] },
  { pattern: /\b(?:makeup|cosmetics?|lipsticks?|mascara)\b/, productType: "beauty product", category: "beauty", terms: ["beauty"] },
  { pattern: /\b(?:skincare|skin care|moisturizers?|serums?)\b/, productType: "skincare", category: "beauty", terms: ["skin"] },
  { pattern: /\b(?:toys?|lego|dolls?)\b/, productType: "toy", category: "toys", terms: ["toy"] },
  { pattern: /\b(?:bicycles?|bikes?)\b/, productType: "bicycle", category: "sports", terms: ["bike"] },
  { pattern: /\b(?:dumbbells?|weights?)\b/, productType: "weights", category: "sports", terms: ["weight"] },
];

const GENERIC_PREFERENCE_WORDS = [
  "comfortable", "comfort", "durable", "durability", "lightweight", "light", "breathable",
  "cheap", "affordable", "budget", "premium", "expensive", "high quality", "waterproof",
  "wireless", "organic", "leather", "cotton", "trail", "race", "running", "gaming",
  "portable", "professional", "fast", "quiet", "soft", "supportive", "cushioned",
];

const FILLER = new Set([
  "i", "need", "want", "looking", "for", "a", "an", "the", "under", "below", "budget", "of",
  "please", "get", "me", "some", "find", "show", "give", "suggest", "recommend", "buy", "purchase",
  "order", "with", "that", "this", "and", "or", "to", "my", "something", "really", "very", "good",
  "nice", "best", "top", "quality", "new", "any", "many", "decent", "solid", "from", "around",
  ...GENERIC_PREFERENCE_WORDS,
]);

function detectProductType(text: string): { productType: string | null; category: string | null; terms: string[] } {
  for (const rule of PRODUCT_TYPE_RULES) {
    if (rule.pattern.test(text)) return { productType: rule.productType, category: rule.category, terms: rule.terms };
  }
  return { productType: null, category: null, terms: [] };
}

function parseBudget(text: string): number | null {
  const match = text.match(/(?:under|below|less than|within|budget of|upto|up to)?\s*[₹$]?\s*(\d{1,3}(?:,\d{3})+|\d{2,7})/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function guessProduct(text: string): string {
  const words = text.replace(/[^a-z0-9\s-]/gi, " ").split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => w.length > 2 && !FILLER.has(w.toLowerCase()) && !/^\d+$/.test(w));
  return significant.slice(-3).join(" ") || "product";
}

/** Deterministic fallback and safety baseline for all LLM intent extraction. */
export function extractIntentDeterministic(message: string): StructuredIntent {
  const text = message.toLowerCase();
  const detected = detectProductType(text);
  const preferences = GENERIC_PREFERENCE_WORDS.filter((p) => text.includes(p));
  const budget = parseBudget(text);
  const qtyMatch = text.match(/\b(\d+)\s*(pairs?|pieces?|units?|x)\b/);
  const quantity = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;

  return {
    product: detected.productType ?? guessProduct(text),
    category: detected.category,
    productType: detected.productType,
    requiredTerms: detected.terms,
    budget,
    preferences: Array.from(new Set(preferences)),
    quantity,
    rawMessage: message,
  };
}

/** Sanitize LLM output and merge in deterministic hard signals from the raw request. */
export function sanitizeIntent(intent: Partial<StructuredIntent>, rawMessage: string): StructuredIntent {
  const deterministic = extractIntentDeterministic(rawMessage);
  const budget = typeof intent.budget === "number" && Number.isFinite(intent.budget) && intent.budget > 0
    ? Math.min(intent.budget, 1_000_000)
    : deterministic.budget;
  const quantity = typeof intent.quantity === "number" && Number.isFinite(intent.quantity)
    ? Math.max(1, Math.min(Math.round(intent.quantity), 10))
    : deterministic.quantity;
  const llmPreferences = Array.isArray(intent.preferences)
    ? intent.preferences.filter((p): p is string => typeof p === "string").slice(0, 8)
    : [];

  const productType = deterministic.productType ?? (typeof intent.productType === "string" && intent.productType.trim() ? intent.productType.trim().toLowerCase() : null);
  const category = deterministic.category ?? (typeof intent.category === "string" && intent.category.trim() ? intent.category.trim().toLowerCase() : null);
  const requiredTerms = Array.from(new Set([
    ...deterministic.requiredTerms,
    ...(Array.isArray(intent.requiredTerms) ? intent.requiredTerms.filter((x): x is string => typeof x === "string") : []),
  ].map((x) => x.toLowerCase().trim()).filter(Boolean))).slice(0, 6);

  return {
    product: productType ?? (typeof intent.product === "string" && intent.product.trim() ? intent.product.trim() : deterministic.product),
    category,
    productType,
    requiredTerms,
    budget,
    preferences: Array.from(new Set([...deterministic.preferences, ...llmPreferences])),
    quantity,
    rawMessage,
  };
}
