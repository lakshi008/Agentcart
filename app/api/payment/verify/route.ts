import { NextRequest, NextResponse } from "next/server";
import { RazorpayPaymentProvider } from "@/lib/payment/razorpay-provider";
import { logEvent } from "@/lib/audit";
import { getCart, clearSession } from "@/lib/session";
import { getSessionUser } from "@/lib/auth";
import { insertOrder, updateUser } from "@/lib/db";
import crypto from "crypto";

/**
 * Called by the frontend after Razorpay Checkout completes successfully.
 * Verifies the HMAC signature server-side before recording the payment.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, overridden? }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, overridden } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing Razorpay fields." }, { status: 400 });
  }

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
  }

  const provider = new RazorpayPaymentProvider(keyId, keySecret);
  const valid    = provider.verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

  const cart = getCart(user.id);

  if (valid) {
    logEvent(user.id, {
      eventType: "PAYMENT_SUCCESS",
      actor: "system",
      action: `₹${cart?.total.toLocaleString("en-IN") ?? "?"} paid via Razorpay — payment_id: ${razorpay_payment_id}`,
      metadata: { orderId: razorpay_order_id, paymentId: razorpay_payment_id, amount: cart?.total ?? 0, overridden: !!overridden },
      status: "success",
    });
    if (cart) {
      insertOrder({
        id: `ord_${crypto.randomBytes(8).toString("hex")}`,
        userId: user.id,
        orderId: razorpay_order_id,
        lines: cart.lines,
        total: cart.total,
        status: "captured",
        overridden: !!overridden,
        createdAt: new Date().toISOString(),
      });
      updateUser(user.id, { wallet: { ...user.wallet, balance: user.wallet.balance - cart.total } });
    }
    clearSession(user.id);
    return NextResponse.json({ success: true });
  } else {
    logEvent(user.id, {
      eventType: "PAYMENT_FAILED",
      actor: "system",
      action: "Razorpay signature verification failed",
      reason: "Invalid HMAC signature — possible tampering",
      metadata: { orderId: razorpay_order_id },
      status: "failed",
    });
    return NextResponse.json({ success: false, error: "Signature verification failed." }, { status: 400 });
  }
}
