import type { PaymentProvider } from "@/lib/payment/types";
import { MockPaymentProvider } from "@/lib/payment/mock-provider";
import { RazorpayPaymentProvider } from "@/lib/payment/razorpay-provider";

/**
 * Returns the real Razorpay provider when both RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET are set, otherwise falls back to the mock.
 *
 * This is the ONLY place that decides which provider is used — no other
 * file imports the providers directly. Policy enforcement, approval gates,
 * and audit logging in the routes above this layer never change.
 */
export function getPaymentProvider(): PaymentProvider {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    console.log("[payment] Using real Razorpay provider (Test Mode)");
    return new RazorpayPaymentProvider(keyId, keySecret);
  }

  return new MockPaymentProvider();
}

export const paymentProvider = getPaymentProvider();
