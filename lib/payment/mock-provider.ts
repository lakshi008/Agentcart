import type { PaymentOrder, PaymentResult } from "@/types";
import type { PaymentProvider } from "@/lib/payment/types";

function randomId(prefix: string) {
  return `${prefix}_test_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(amountPaise: number, currency = "INR"): Promise<PaymentOrder> {
    if (amountPaise <= 0) {
      return { success: false, orderId: "", amount: amountPaise, currency: currency as "INR", status: "failed", reason: "Invalid amount." };
    }
    return { success: true, orderId: randomId("order"), amount: amountPaise, currency: currency as "INR", status: "created" };
  }
  async verifyPayment(orderId: string, simulateOutcome: "success"|"failure" = "success"): Promise<PaymentResult> {
    if (simulateOutcome === "failure") return { success: false, orderId, status: "failed", reason: "Test payment declined." };
    return { success: true, orderId, status: "captured" };
  }
}
