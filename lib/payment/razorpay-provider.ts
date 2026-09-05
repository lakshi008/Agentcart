import type { PaymentOrder, PaymentResult } from "@/types";
import type { PaymentProvider } from "@/lib/payment/types";
import crypto from "crypto";

/**
 * Real Razorpay Test Mode provider.
 * Requires environment variables:
 *   RAZORPAY_KEY_ID      — your test key id  (rzp_test_...)
 *   RAZORPAY_KEY_SECRET  — your test secret  (never exposed to the client)
 *
 * On the frontend, after this returns an order_id, open Razorpay Checkout
 * with the public NEXT_PUBLIC_RAZORPAY_KEY_ID. The checkout will call back
 * your /api/payment/verify route which validates the signature here.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  private keyId:     string;
  private keySecret: string;
  private baseUrl = "https://api.razorpay.com/v1";

  constructor(keyId: string, keySecret: string) {
    this.keyId     = keyId;
    this.keySecret = keySecret;
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
  }

  async createOrder(amountPaise: number, currency = "INR"): Promise<PaymentOrder> {
    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   this.authHeader(),
        },
        body: JSON.stringify({
          amount:   amountPaise,
          currency,
          receipt:  `ac_${Date.now()}`,
          notes: { source: "agentcart" },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          orderId: "",
          amount:  amountPaise,
          currency: currency as "INR",
          status:  "failed",
          reason:  err?.error?.description ?? `Razorpay error ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        orderId: data.id,
        amount:  data.amount,
        currency: data.currency as "INR",
        status:  "created",
      };
    } catch (err) {
      return {
        success: false,
        orderId: "",
        amount:  amountPaise,
        currency: currency as "INR",
        status:  "failed",
        reason:  (err as Error).message,
      };
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature that Razorpay sends back after a
   * successful payment. Call this from /api/payment/verify with the three
   * fields Razorpay Checkout sends to your handler.
   */
  verifySignature(params: {
    razorpay_order_id:   string;
    razorpay_payment_id: string;
    razorpay_signature:  string;
  }): boolean {
    const body      = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
    const expected  = crypto
      .createHmac("sha256", this.keySecret)
      .update(body)
      .digest("hex");
    return expected === params.razorpay_signature;
  }

  /**
   * For the mock simulation path (used in dev / when Checkout is not open).
   * In production, use verifySignature() with the real Razorpay callback data.
   */
  async verifyPayment(
    orderId: string,
    simulateOutcome: "success" | "failure" = "success"
  ): Promise<PaymentResult> {
    if (simulateOutcome === "failure") {
      return { success: false, orderId, status: "failed", reason: "Test payment declined." };
    }
    return { success: true, orderId, status: "captured" };
  }
}
