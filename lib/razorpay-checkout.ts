"use client";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(params: {
  orderId: string;
  amountPaise: number;
  currency: string;
  userName?: string;
  userEmail?: string;
  onSuccess: (data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onDismiss: () => void;
}): Promise<void> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    console.warn("[razorpay] NEXT_PUBLIC_RAZORPAY_KEY_ID not set — skipping real checkout.");
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    console.error("[razorpay] Failed to load checkout.js");
    return;
  }

  const rz = new window.Razorpay({
    key:         keyId,
    amount:      params.amountPaise,
    currency:    params.currency,
    name:        "AgentCart",
    description: "AI-powered purchase",
    order_id:    params.orderId,
    handler:     params.onSuccess,
    prefill: {
      name:  params.userName,
      email: params.userEmail,
    },
    theme: { color: "#4B1D3F" },
    modal: { ondismiss: params.onDismiss },
  });

  rz.open();
}

/** Returns true when the real Razorpay key is available on the client. */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}
