// ---------------------------------------------------------------------------
// AgentCart shared types
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // INR, whole rupees
  rating: number;
  stock: number;
  image: string; // emoji or short glyph used as a stand-in product image
  attributes: Record<string, number | boolean | string>;
  relatedProducts: string[];
  description: string;
}

export interface ScoredProduct {
  product: Product;
  score: number; // 0-100 final match score
  breakdown: {
    label: string;
    points: number;
    max: number;
  }[];
}

export interface StructuredIntent {
  product: string;
  /** Canonical product family, e.g. "shoes", "smartphones", "laptops". */
  category: string | null;
  /** Specific item type, e.g. "running shoes". This is a hard retrieval constraint. */
  productType: string | null;
  /** Significant product words that should be present in a valid candidate. */
  requiredTerms: string[];
  budget: number | null;
  preferences: string[];
  quantity: number;
  rawMessage: string;
}

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  reason: string; // why it's in the cart ("primary pick" | "upsell")
  kind: "primary" | "upsell";
}

export interface Cart {
  lines: CartLine[];
  total: number; // INR
}

export interface PolicyCheckResult {
  name: string;
  status: "passed" | "failed" | "pending";
  detail: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  checks: PolicyCheckResult[];
  overridden?: boolean;
}

export interface PolicyConfig {
  maxTransactionAmount: number;
  dailySpendingLimit: number;
  maxQuantityPerItem: number;
  userApprovalRequired: boolean;
  maxPaymentAttempts: number;
}

export type AuditEventType =
  | "USER_REQUEST"
  | "PRODUCT_INFO_REQUESTED"
  | "INTENT_EXTRACTED"
  | "CATALOG_SEARCHED"
  | "PRODUCTS_FILTERED"
  | "PRODUCT_RANKED"
  | "RECOMMENDATION_CREATED"
  | "UPSELL_DETECTED"
  | "PRODUCT_ADDED"
  | "POLICY_CHECK_STARTED"
  | "POLICY_CHECK_PASSED"
  | "POLICY_CHECK_FAILED"
  | "USER_APPROVED"
  | "PAYMENT_ORDER_CREATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_BLOCKED";

export interface AuditEvent {
  id: string;
  userId?: string;
  timestamp: string;
  eventType: AuditEventType;
  actor: "user" | "agent" | "system";
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  status: "success" | "pending" | "blocked" | "failed";
}

export interface AgentActivityStep {
  id: string;
  label: string;
  detail?: string;
  status: "done" | "active" | "pending" | "warning" | "blocked";
  timestamp: string;
  icon:
    | "understand"
    | "intent"
    | "constraints"
    | "search"
    | "rank"
    | "select"
    | "upsell"
    | "policy"
    | "approval"
    | "payment"
    | "verify"
    | "blocked";
}

export interface PaymentOrder {
  success: boolean;
  orderId: string;
  amount: number; // paise
  currency: "INR";
  status: "created" | "failed";
  reason?: string;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  status: "captured" | "failed";
  reason?: string;
}

export interface ShoppingAgentTurn {
  mode: "shopping";
  intent: StructuredIntent;
  ranked: ScoredProduct[];
  primary: ScoredProduct;
  explanation: string;
  upsell: {
    product: Product;
    reason: string;
  } | null;
  cart: Cart;
  policy: PolicyDecision;
  activity: AgentActivityStep[];
}

export interface ProductInfoAgentTurn {
  mode: "info";
  text: string;
  product: Product | null;
  activity: AgentActivityStep[];
}

export type AgentTurn = ShoppingAgentTurn | ProductInfoAgentTurn;

// ---------------------------------------------------------------------------
// SaaS layer: auth, wallet, per-user LLM settings, orders, conversational refinement
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  wallet: {
    balance: number; // mock wallet balance, INR
    savedMethodLabel: string | null; // e.g. "UPI: name@okbank" — never a real card/PAN
  };
  policy: PolicyConfig & { hardCeiling: number };
}

export type PublicUser = Omit<User, "passwordHash">;

export interface Order {
  id: string;
  userId: string;
  orderId: string;
  lines: CartLine[];
  total: number;
  status: "captured" | "failed";
  overridden: boolean;
  createdAt: string;
}

export interface RefineAction {
  type: "new_search" | "refine" | "unclear";
  action?:
    | "next_alternative"
    | "prefer_cheaper"
    | "prefer_premium"
    | "set_budget"
    | "remove_upsell"
    | "add_upsell";
  value?: number;
}
