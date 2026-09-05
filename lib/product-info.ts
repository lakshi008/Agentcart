import type { Product } from "@/types";
import { findCatalogProduct, getCatalog, textSearch } from "@/lib/catalog";

const STRONG_INFO_PATTERNS: RegExp[] = [
  /\btell me (more )?about\b/i,
  /\b(describe|description of)\b/i,
  /\bdetails?\s+(on|about|for)\b/i,
  /\b(specs?|specifications?)\s+(of|for|on)\b/i,
  /\bmore info(rmation)?\s+(on|about)\b/i,
  /\bhow does\b.*\bwork\b/i,
  /\bwhat('?s| is| are) .* (made of|used for)\b/i,
  /\b(?:is there|are there|does .* have|what(?:'?s| is) the)\b.*\bdiscount|\bdiscount\b.*\b(?:on|for)\b/i,
];
const WEAK_INFO_PATTERNS: RegExp[] = [/\bwhat('?s| is| are)\b/i];
const SHOPPING_SIGNAL_WORDS = ["best","good","cheap","cheapest","budget","affordable","under","below","less than","within","recommend","buy","purchase","looking for","need","want","find me","show me","suggest","top rated","for me"];
const SUBJECT_STRIP_PATTERNS: RegExp[] = [
  /^(please\s+)?tell me (more )?about\s+/i,
  /^(please\s+)?(can|could) you (describe|tell me about)\s+/i,
  /^describe\s+/i,
  /^description of\s+/i,
  /^details?\s+(on|about|for)\s+/i,
  /^(specs?|specifications?)\s+(of|for|on)\s+/i,
  /^(?:is there|are there) (?:any )?discounts? (?:on|for)\s+/i,
  /^(?:what(?:\'s| is) (?:the )?)?discount (?:on|for)\s+/i,
  /^more info(rmation)?\s+(on|about)\s+/i,
  /^what('?s| is| are)\s+(a|an|the)?\s*/i,
  /^how does\s+/i,
];

export function isProductInfoQuery(message: string): boolean {
  const text = message.toLowerCase().trim();
  if (!text) return false;
  if (STRONG_INFO_PATTERNS.some((p) => p.test(text))) return true;
  if (!WEAK_INFO_PATTERNS.some((p) => p.test(text))) return false;
  return !SHOPPING_SIGNAL_WORDS.some((w) => text.includes(w));
}

export function isFollowUpQuestion(message: string): boolean {
  const text = message.toLowerCase().trim();
  if (!text) return false;
  const looksLikeQuestion = /^(how|what|does|do|did|is|are|can|could|will|would|why|when|where|should)\b/.test(text) || text.endsWith("?");
  if (!looksLikeQuestion) return false;
  return !SHOPPING_SIGNAL_WORDS.some((w) => text.includes(w));
}

function extractSubject(message: string): string {
  let text = message.trim();
  for (const pattern of SUBJECT_STRIP_PATTERNS) {
    if (pattern.test(text)) { text = text.replace(pattern, ""); break; }
  }
  return text.replace(/\bwork(s)?\??\s*$/i, "").replace(/[?!.]+$/g, "").trim();
}

function findProduct(subject: string): Product | null {
  const direct = findCatalogProduct(subject);
  if (direct) return direct;
  const results = textSearch(subject);
  return results[0] ?? null;
}

function answerFromProduct(question: string, product: Product): string {
  const q = question.toLowerCase();
  const attrs = product.attributes;
  const pick = (...keys: string[]) => keys.map((k) => attrs[k]).find((v) => v !== undefined && v !== "");

  const actualPrice = Number(pick("actualPrice"));
  const discountPrice = Number(pick("discountPrice")) || product.price;
  if (/\b(discount|offer|sale|off)\b/.test(q)) {
    if (Number.isFinite(actualPrice) && actualPrice > discountPrice && discountPrice > 0) {
      const pct = Math.round(((actualPrice - discountPrice) / actualPrice) * 100);
      return `${product.name} is listed at ₹${discountPrice.toLocaleString("en-IN")} versus an actual/list price of ₹${actualPrice.toLocaleString("en-IN")}, which is about ${pct}% off.`;
    }
    return `${product.name} does not have a discount listed in the Kaggle catalog.`;
  }
  if (/\b(price|cost|how much)\b/.test(q)) {
    if (Number.isFinite(actualPrice) && actualPrice > discountPrice) return `${product.name} is listed at ₹${discountPrice.toLocaleString("en-IN")} (down from ₹${actualPrice.toLocaleString("en-IN")}).`;
    return `${product.name} is listed at ₹${product.price.toLocaleString("en-IN")}.`;
  }
  if (/\b(brand|made by|manufacturer)\b/.test(q)) return `${product.name} is listed under the brand ${String(pick("brand") ?? "not specified")}.`;
  if (/\b(color|colour)\b/.test(q)) return `${product.name} is listed in ${String(pick("color") ?? "a color not specified in the catalog")}.`;
  if (/\b(material|made of)\b/.test(q)) return `${product.name} is listed with material ${String(pick("material") ?? "not specified")}.`;
  if (/\b(type|category|kind)\b/.test(q)) return `${product.name} is categorized as ${String(pick("productType") ?? product.category)}.`;
  if (/\b(size|dimension|dimensions|width|height|length)\b/.test(q)) {
    const dims = pick("dimensions");
    if (dims) return `${product.name} has these catalog dimensions: ${String(dims)}.`;
  }

  const description = product.description.trim();
  const demo = attrs.syntheticStock ? " Stock shown by AgentCart is a deterministic demo value because the Kaggle dataset is not a live inventory feed." : "";
  return `${product.name} is a ${String(pick("brand") ?? "catalog") } product in ${product.category}. ${description}${demo}`.trim();
}

export async function answerProductInfoQuery(message: string, contextProduct: Product | null): Promise<{ text: string; product: Product | null }> {
  const subject = extractSubject(message);
  const product = findProduct(subject) ?? (subject.length < 3 ? contextProduct : null);
  if (!product) return { text: `I couldn't find that product in the Amazon catalog. Try the exact product name, brand, or model.`, product: null };
  return { text: answerFromProduct(message, product), product };
}

export async function answerFollowUpAboutProduct(message: string, product: Product, _context?: unknown): Promise<string> {
  return answerFromProduct(message, product);
}

export async function generateInfoCounterQuestion(message: string): Promise<string> {
  return `I couldn't find a matching product for “${message}” in the ABO catalog. Try the product name, brand, or model.`;
}

export function getCatalogProducts(): Product[] { return getCatalog(); }
