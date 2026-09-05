import type {
  AgentActivityStep,
  AgentTurn,
  Cart,
  CartLine,
  Product,
  ScoredProduct,
  StructuredIntent,
} from "@/types";
import { extractIntentDeterministic, sanitizeIntent } from "@/lib/intent";
import {
  isProductInfoQuery,
  isFollowUpQuestion,
  answerProductInfoQuery,
  answerFollowUpAboutProduct,
} from "@/lib/product-info";
import { rankProducts, explainSelection, findUpsell } from "@/lib/recommendation";
import { evaluatePolicy } from "@/lib/policy";
import { logEvent } from "@/lib/audit";
import { chatCompletion } from "@/lib/llm";
import { classifyRefinement, applyRefinement } from "@/lib/refine";
import {
  getConversationContext,
  setConversationContext,
  pushHistory,
  getHistory,
  getLastProduct,
  setLastProduct,
} from "@/lib/session";
import { sumCapturedToday } from "@/lib/db";
import { ensureLiveCommerceProducts } from "@/lib/catalog";
import type { PolicyConfig } from "@/types";

let stepCounter = 0;
function step(
  label: string,
  status: AgentActivityStep["status"],
  icon: AgentActivityStep["icon"],
  detail?: string
): AgentActivityStep {
  stepCounter += 1;
  return {
    id: `step_${stepCounter}`,
    label,
    detail,
    status,
    icon,
    timestamp: new Date().toISOString(),
  };
}

interface RunAgentTurnParams {
  userId: string;
  message: string;
  policy: PolicyConfig;
}

/**
 * The controlled agent workflow: receive -> classify (new search vs
 * conversational refinement) -> extract/adjust intent -> search -> filter ->
 * rank -> recommend -> upsell -> proposed cart -> policy check -> (wait for
 * approval). Nothing here can create a payment order or bypass a policy —
 * it only ever produces a *proposal* plus a transparent activity trail.
 */
export async function runAgentTurn(params: RunAgentTurnParams): Promise<AgentTurn> {
  const { userId, message, policy } = params;
  const activity: AgentActivityStep[] = [];

  activity.push(step("Understanding request", "done", "understand"));
  logEvent(userId, { eventType: "USER_REQUEST", actor: "user", action: message, status: "success" });
  pushHistory(userId, "user", message);

  const context = getConversationContext(userId);
  const hasPriorTurn = context.lastIntent != null && context.lastRanked.length > 0;
  const lastProduct = getLastProduct(userId);

  // Two info-style paths, both short-circuiting the shopping pipeline below:
  //
  //  1. isProductInfoQuery — explicit "tell me about X" / "what is X" /
  //     "describe X". May name a *different* product than whatever was
  //     last discussed, so it always tries to resolve its own subject first.
  //  2. isFollowUpQuestion — a bare, unnamed follow-up ("how long will it
  //     last me", "is it worth it", "does it come with a case") that only
  //     makes sense attached to a product the conversation already has in
  //     view. This is what used to be completely mishandled: a question
  //     like this carried no shopping keywords the ranker could use, so it
  //     fell through to a fresh, essentially random search instead of being
  //     answered about the product just shown.
  //
  // Both answer directly from catalog facts and never touch ranking, cart,
  // or policy.
  const isInfoQuery = isProductInfoQuery(message);
  const isBareFollowUp = !isInfoQuery && lastProduct != null && isFollowUpQuestion(message);

  if (isInfoQuery || isBareFollowUp) {
    activity.push(
      step("Info request detected", "done", "understand", "Answering directly — no purchase flow started")
    );
    logEvent(userId, {
      eventType: "PRODUCT_INFO_REQUESTED",
      actor: "agent",
      action: isBareFollowUp
        ? "Classified message as a follow-up question about the last discussed product"
        : "Classified message as a product-info question rather than a shopping request",
      status: "success",
    });

    let answer: string;
    let product: Product | null = null;

    if (isBareFollowUp && lastProduct) {
      product = lastProduct.product;
      answer = await answerFollowUpAboutProduct(message, lastProduct.product, lastProduct.context);
    } else {
      const result = await answerProductInfoQuery(message, lastProduct?.product ?? null);
      answer = result.text;
      product = result.product;
      if (product) setLastProduct(userId, product);
    }

    pushHistory(userId, "agent", answer);

    return {
      mode: "info",
      text: answer,
      product,
      activity,
    };
  }

  const refineDecision = await classifyRefinement(message, hasPriorTurn);

  let intent: StructuredIntent;
  let ranked: ScoredProduct[];
  let refinementNote: string | null = null;

  if (refineDecision.type === "refine" && hasPriorTurn && context.lastIntent) {
    const applied = applyRefinement(refineDecision, context.lastIntent, context.lastRanked, context.shownProductIds);
    intent = applied.intent;
    ranked = applied.ranked;
    refinementNote = describeRefinement(refineDecision);
    activity.push(step("Refining previous recommendation", "done", "constraints", refinementNote));
  } else {
    intent = await extractIntent(message);
    activity.push(
      step(
        "Intent extracted",
        "done",
        "intent",
        `Product: ${intent.productType ?? intent.category ?? intent.product}${intent.budget ? ` · Budget: ₹${intent.budget.toLocaleString("en-IN")}` : ""}`
      )
    );
    const liveSource = await ensureLiveCommerceProducts(intent);
    ranked = rankProducts(intent);
    activity.push(step(
      "Merchant catalog searched",
      "done",
      "search",
      `${ranked.length} valid product(s) found from the ABO catalog`
    ));
  }

  logEvent(userId, {
    eventType: "INTENT_EXTRACTED",
    actor: "agent",
    action: refinementNote ? `Refined search: ${refinementNote}` : "Extracted structured intent from user request",
    metadata: { ...intent },
    status: "success",
  });

  if (ranked.length === 0) {
    activity.push(step("No matching products found", "blocked", "blocked", "Asking for clarification."));
    logEvent(userId, {
      eventType: "PRODUCTS_FILTERED",
      actor: "agent",
      action: "No products matched — asking counter-question",
      status: "blocked",
    });
    const counterQ = await generateCounterQuestion(intent);
    throw new Error(counterQ);
  }

  activity.push(step("Products ranked", "done", "rank", `Top score: ${ranked[0].score}%`));
  logEvent(userId, {
    eventType: "PRODUCT_RANKED",
    actor: "agent",
    action: `${ranked[0].product.name} ranked #1`,
    reason: "Highest weighted score across category, budget, preference, rating and stock.",
    metadata: { breakdown: ranked[0].breakdown, score: ranked[0].score },
    status: "success",
  });

  const primary = ranked[0];
  const explanation = await explainWithAI(primary, intent);

  activity.push(step("Best product selected", "done", "select", primary.product.name));
  logEvent(userId, {
    eventType: "RECOMMENDATION_CREATED",
    actor: "agent",
    action: `Recommended ${primary.product.name}`,
    reason: explanation,
    status: "success",
  });

  const upsell = findUpsell(primary.product, intent);
  if (upsell) {
    activity.push(step("Revenue opportunity detected", "done", "upsell", upsell.product.name));
    logEvent(userId, {
      eventType: "UPSELL_DETECTED",
      actor: "agent",
      action: `Suggested ${upsell.product.name}`,
      reason: upsell.reason,
      status: "success",
    });
  }

  const cart = buildCart(primary.product, intent.quantity, upsell?.product ?? null);

  const spentToday = sumCapturedToday(userId);
  const policyDecision = evaluatePolicy({
    cart,
    policy,
    spentToday,
    approvalGranted: false,
    paymentAttemptsUsed: 0, // a fresh proposal always gets a clean attempt budget
  });

  logEvent(userId, {
    eventType: "POLICY_CHECK_STARTED",
    actor: "system",
    action: "Evaluating proposed cart against spending policy",
    metadata: { total: cart.total },
    status: "pending",
  });

  if (policyDecision.checks.some((c) => c.status === "failed")) {
    activity.push(step("Policy validation failed", "blocked", "blocked", policyDecision.reason));
    logEvent(userId, {
      eventType: "POLICY_CHECK_FAILED",
      actor: "system",
      action: "Policy check failed",
      reason: policyDecision.reason,
      metadata: { checks: policyDecision.checks },
      status: "blocked",
    });
  } else {
    activity.push(step("Policy validation pending", "warning", "policy", "Awaiting user approval"));
    activity.push(step("Payment requires approval", "warning", "approval", `Total ₹${cart.total.toLocaleString("en-IN")}`));
  }

  setConversationContext(userId, intent, ranked, primary.product.id);
  setLastProduct(userId, primary.product, { scored: primary, intent });
  pushHistory(userId, "agent", explanation);

  return { mode: "shopping", intent, ranked, primary, explanation, upsell, cart, policy: policyDecision, activity };
}

function describeRefinement(action: { action?: string; value?: number }): string {
  switch (action.action) {
    case "next_alternative":
      return "Showing another option.";
    case "prefer_cheaper":
      return "Looking for something cheaper.";
    case "prefer_premium":
      return "Looking for something higher-end.";
    case "set_budget":
      return `Budget updated to ₹${(action.value ?? 0).toLocaleString("en-IN")}.`;
    default:
      return "Adjusted based on your feedback.";
  }
}

function buildCart(primary: Product, quantity: number, upsell: Product | null): Cart {
  const lines: CartLine[] = [
    {
      productId: primary.id,
      name: primary.name,
      price: primary.price,
      quantity,
      reason: "Primary recommendation matching your request.",
      kind: "primary",
    },
  ];

  if (upsell) {
    lines.push({
      productId: upsell.id,
      name: upsell.name,
      price: upsell.price,
      quantity: 1,
      reason: "Suggested cross-sell.",
      kind: "upsell",
    });
  }

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return { lines, total };
}

async function extractIntent(message: string): Promise<StructuredIntent> {
  const { text } = await chatCompletion(
    {
      system:
        "Extract shopping intent as strict JSON only, no prose, no markdown fences. " +
        'Shape: {"product": string, "category": string|null, "productType": string|null, "requiredTerms": string[], "budget": number|null, "preferences": string[], "quantity": number}. ' +
        "productType is the specific item the shopper wants (for example running shoes, smartphone, laptop). " +
        "requiredTerms are words that must describe a valid candidate. Never broaden a specific product type into a generic category.",
      user: message,
      maxTokens: 300,
    },
  );

  if (!text) return extractIntentDeterministic(message);

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return sanitizeIntent(parsed, message);
  } catch {
    return extractIntentDeterministic(message);
  }
}

async function explainWithAI(
  primary: ScoredProduct,
  intent: StructuredIntent
): Promise<string> {
  const deterministic = explainSelection(primary, intent);

  const { text } = await chatCompletion(
    {
      system:
        "Rewrite the given product-selection justification in 1-2 warm, honest sentences for a shopper. " +
        "Do not invent any facts, numbers, or attributes beyond what is given. If the draft mentions the " +
        "price being over the shopper's budget, you MUST keep that caveat in your rewrite — never drop it " +
        "just to sound more positive. Return plain text only.",
      user: `Facts: ${JSON.stringify({
        product: primary.product.name,
        score: primary.score,
        breakdown: primary.breakdown,
        budget: intent.budget,
        productType: intent.productType,
        requiredTerms: intent.requiredTerms,
        preferences: intent.preferences,
      })}\n\nDraft: ${deterministic}`,
      maxTokens: 160,
    },
  );

  return text ?? deterministic;
}

async function generateCounterQuestion(
  intent: StructuredIntent
): Promise<string> {
  const { text } = await chatCompletion(
    {
      system:
        "You are a helpful shopping agent. The user's request did not match any products in the catalog. " +
        "Ask ONE short, friendly clarifying question to understand what they're looking for. " +
        "Offer 2-3 concrete alternative suggestions from these general categories: " +
        "smartphones, laptops, fragrances, skincare, groceries, furniture, tops, watches. " +
        "Keep it under 2 sentences. Return plain text only.",
      user: `User asked for: "${intent.rawMessage}". Extracted: product="${intent.product}", category="${intent.category}", budget=${intent.budget}`,
      maxTokens: 100,
    },
  );

  return text ?? `I couldn't find "${intent.product}" in the catalog. Could you tell me more? I carry smartphones, laptops, fragrances, skincare, furniture, watches, and more. Or try a broader term like "phone" or "perfume".`;
}

export { getHistory };
