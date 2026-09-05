import type { Cart, Product, ScoredProduct, StructuredIntent } from "@/types";

// Per-user, in-memory session state: the active proposed cart, approval
// status, payment-attempt budget, and enough of the last agent turn's
// context (ranked candidates + intent) to support conversational follow-ups
// like "not this, another one" or "that's too expensive" without the user
// having to restate their whole request.
//
// Keyed by userId now that the app has real accounts. Still in-memory —
// resets on server restart, same as before — but that's fine for a cart
// mid-checkout; orders themselves are persisted (see lib/db.ts).

interface SessionState {
  cart: Cart | null;
  approvalGranted: boolean;
  paymentAttempts: number;
  lastIntent: StructuredIntent | null;
  lastRanked: ScoredProduct[]; // full ranked candidate list from the last search
  shownProductIds: string[]; // primary picks already shown this conversation
  history: { role: "user" | "agent"; text: string }[]; // short rolling transcript for LLM context
  // The single product the conversation is currently "about" — set whenever
  // the agent describes a product (via an info lookup) or recommends one
  // (via the shopping pipeline). Lets a bare follow-up like "how long will
  // it last me" or "why is it worth it" resolve to a concrete product
  // without the user having to repeat its name.
  lastProduct: Product | null;
  lastProductContext: { scored?: ScoredProduct; intent?: StructuredIntent } | null;
}

function emptyState(): SessionState {
  return {
    cart: null,
    approvalGranted: false,
    paymentAttempts: 0,
    lastIntent: null,
    lastRanked: [],
    shownProductIds: [],
    history: [],
    lastProduct: null,
    lastProductContext: null,
  };
}

const sessions = new Map<string, SessionState>();

function stateFor(userId: string): SessionState {
  if (!sessions.has(userId)) sessions.set(userId, emptyState());
  return sessions.get(userId)!;
}

export function getSessionState(userId: string): SessionState {
  return stateFor(userId);
}

export function setCart(userId: string, cart: Cart) {
  const s = stateFor(userId);
  s.cart = cart;
  s.approvalGranted = false;
  s.paymentAttempts = 0; // a new proposed transaction gets a fresh attempt budget
}

export function getCart(userId: string): Cart | null {
  return stateFor(userId).cart;
}

export function grantApproval(userId: string) {
  stateFor(userId).approvalGranted = true;
}

export function isApprovalGranted(userId: string): boolean {
  return stateFor(userId).approvalGranted;
}

export function getPaymentAttempts(userId: string): number {
  return stateFor(userId).paymentAttempts;
}

export function recordPaymentAttempt(userId: string) {
  stateFor(userId).paymentAttempts += 1;
}

export function setConversationContext(
  userId: string,
  intent: StructuredIntent,
  ranked: ScoredProduct[],
  shownProductId: string
) {
  const s = stateFor(userId);
  s.lastIntent = intent;
  s.lastRanked = ranked;
  if (!s.shownProductIds.includes(shownProductId)) s.shownProductIds.push(shownProductId);
}

export function getConversationContext(userId: string) {
  const s = stateFor(userId);
  return { lastIntent: s.lastIntent, lastRanked: s.lastRanked, shownProductIds: s.shownProductIds };
}

export function setLastProduct(
  userId: string,
  product: Product,
  context?: { scored?: ScoredProduct; intent?: StructuredIntent }
) {
  const s = stateFor(userId);
  s.lastProduct = product;
  s.lastProductContext = context ?? null;
}

export function getLastProduct(userId: string): {
  product: Product;
  context: { scored?: ScoredProduct; intent?: StructuredIntent } | null;
} | null {
  const s = stateFor(userId);
  if (!s.lastProduct) return null;
  return { product: s.lastProduct, context: s.lastProductContext };
}

export function pushHistory(userId: string, role: "user" | "agent", text: string) {
  const s = stateFor(userId);
  s.history.push({ role, text });
  if (s.history.length > 12) s.history.splice(0, s.history.length - 12);
}

export function getHistory(userId: string) {
  return stateFor(userId).history;
}

export function clearSession(userId: string) {
  sessions.set(userId, emptyState());
}
