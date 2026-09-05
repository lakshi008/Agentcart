import type { RefineAction, ScoredProduct, StructuredIntent } from "@/types";
import { chatCompletion } from "@/lib/llm";
import { rankProducts } from "@/lib/recommendation";

/**
 * Classifies a follow-up message as either a brand-new search or a
 * refinement of what was already shown. Refinements only ever change a
 * *search parameter* (budget, price tier, which candidate to show) —
 * nothing here can touch cart totals, policy, or payment directly. The
 * calling code in lib/agent.ts always re-runs ranking, upsell, and the
 * policy engine after a refinement, exactly like a fresh search.
 *
 * Deterministic keyword matching is always tried first; the LLM (if
 * configured) is only consulted when the keywords don't clearly match,
 * and its output is validated against a fixed enum before use.
 */
export async function classifyRefinement(
  message: string,
  hasPriorTurn: boolean,
): Promise<RefineAction> {
  const deterministic = classifyDeterministic(message, hasPriorTurn);
  if (deterministic.type !== "unclear" || !hasPriorTurn) return deterministic;

  const raw = await chatCompletion(
    {
      system:
        "Classify a shopper's follow-up message. Reply with strict JSON only, no prose. " +
        'Shape: {"type": "new_search"|"refine"|"unclear", "action"?: "next_alternative"|"prefer_cheaper"|"prefer_premium"|"set_budget"|"remove_upsell"|"add_upsell", "value"?: number}. ' +
        '"refine" means the message is about the product just shown (e.g. "not this, another one" -> next_alternative; ' +
        '"too expensive"/"cheaper please" -> prefer_cheaper; "too cheap"/"something better" -> prefer_premium; ' +
        '"change budget to 4000" -> set_budget with value 4000; "skip the addon" -> remove_upsell; "add it" -> add_upsell). ' +
        '"new_search" means an unrelated new product request. "unclear" if genuinely ambiguous.',
      user: message,
      maxTokens: 100,
    },
  );

  if (!raw.text) return deterministic;
  try {
    const parsed = JSON.parse(raw.text.replace(/```json|```/g, "").trim());
    return sanitizeRefineAction(parsed);
  } catch {
    return deterministic;
  }
}

function sanitizeRefineAction(input: unknown): RefineAction {
  if (typeof input !== "object" || input === null) return { type: "unclear" };
  const obj = input as Record<string, unknown>;
  const type = obj.type;
  if (type !== "new_search" && type !== "refine" && type !== "unclear") return { type: "unclear" };

  const validActions = ["next_alternative", "prefer_cheaper", "prefer_premium", "set_budget", "remove_upsell", "add_upsell"];
  const action = typeof obj.action === "string" && validActions.includes(obj.action) ? (obj.action as RefineAction["action"]) : undefined;
  const value = typeof obj.value === "number" && Number.isFinite(obj.value) ? Math.min(Math.max(obj.value, 0), 1_000_000) : undefined;

  return { type, action, value };
}

function classifyDeterministic(message: string, hasPriorTurn: boolean): RefineAction {
  const text = message.toLowerCase().trim();
  if (!hasPriorTurn) return { type: "new_search" };

  if (/\b(not this|something else|another one|different one|next option|show me another)\b/.test(text)) {
    return { type: "refine", action: "next_alternative" };
  }
  if (/\b(too (expensive|pricey|costly|high)|cheaper|lower price|reduce the price|less expensive)\b/.test(text)) {
    return { type: "refine", action: "prefer_cheaper" };
  }
  if (/\b(too (cheap|low)|more expensive|premium|upgrade|higher quality|better one|higher price)\b/.test(text)) {
    return { type: "refine", action: "prefer_premium" };
  }
  if (/\b(skip|remove|no thanks?) (the )?(add[- ]?on|upsell|extra|socks?)\b/.test(text)) {
    return { type: "refine", action: "remove_upsell" };
  }
  if (/\b(add|include|yes) (the )?(add[- ]?on|upsell|extra)\b/.test(text)) {
    return { type: "refine", action: "add_upsell" };
  }

  const budgetChangeMatch = text.match(
    /\b(?:change|set|update|increase|raise|lower|decrease)?\s*(?:the\s+)?(?:budget|price|pricing|limit)\s*(?:to|=|is)?\s*[₹$]?\s*(\d{2,6})/
  );
  if (budgetChangeMatch) {
    return { type: "refine", action: "set_budget", value: Number(budgetChangeMatch[1]) };
  }
  // a bare number on its own, right after seeing a product, usually means "budget is actually X"
  if (/^\s*[₹$]?\s*\d{2,6}\s*$/.test(text)) {
    return { type: "refine", action: "set_budget", value: Number(text.replace(/[^\d]/g, "")) };
  }

  return { type: "unclear" };
}

/**
 * Applies a validated refine action to the prior candidate list, returning a
 * fresh ranked list + intent. Always deterministic — no LLM in this path.
 */
export function applyRefinement(
  action: RefineAction,
  priorIntent: StructuredIntent,
  priorRanked: ScoredProduct[],
  shownProductIds: string[]
): { intent: StructuredIntent; ranked: ScoredProduct[] } {
  switch (action.action) {
    case "next_alternative": {
      const remaining = priorRanked.filter((r) => !shownProductIds.includes(r.product.id));
      if (remaining.length > 0) return { intent: priorIntent, ranked: remaining };
      // exhausted the list — widen the search by dropping the category constraint
      const widened = rankProducts({ ...priorIntent, category: null });
      return { intent: priorIntent, ranked: widened.filter((r) => !shownProductIds.includes(r.product.id)) };
    }
    case "prefer_cheaper": {
      const cheaper = [...priorRanked].sort((a, b) => a.product.price - b.product.price);
      return { intent: priorIntent, ranked: cheaper };
    }
    case "prefer_premium": {
      const premium = [...priorRanked].sort((a, b) => b.product.price - a.product.price);
      return { intent: priorIntent, ranked: premium };
    }
    case "set_budget": {
      const nextIntent: StructuredIntent = { ...priorIntent, budget: action.value ?? priorIntent.budget };
      return { intent: nextIntent, ranked: rankProducts(nextIntent) };
    }
    default:
      return { intent: priorIntent, ranked: priorRanked };
  }
}
