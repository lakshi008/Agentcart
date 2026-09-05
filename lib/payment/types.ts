import type { PaymentOrder, PaymentResult } from "@/types";

/**
 * Abstraction so the mock provider used for the MVP can be swapped for a
 * RazorpayPaymentProvider later without touching any calling code. The
 * Razorpay key secret must only ever live behind this interface, server-side.
 */
export interface PaymentProvider {
  createOrder(amountPaise: number, currency?: string): Promise<PaymentOrder>;
  verifyPayment(orderId: string, simulateOutcome?: "success" | "failure"): Promise<PaymentResult>;
}
