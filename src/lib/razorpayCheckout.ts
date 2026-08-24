// Client-side Razorpay Checkout driver, shared by every surface that collects
// an online advance (the two booking wizards via PaymentBox today). Owns the
// full round trip: load checkout.js → create the order server-side → open the
// modal → verify the callback signature server-side (which also records the
// payment). Callers get back the verified paid amount + payment id, or a typed
// error they can translate for the customer.

export type RazorpayCheckoutErrorCode =
  // The customer closed the modal without paying — not a failure to shout about.
  | "dismissed"
  // checkout.js wouldn't load (offline / blocked).
  | "unavailable"
  // Order creation or the payment itself failed.
  | "failed"
  // The customer paid but our verify call didn't land — money may have moved,
  // so the message must say "don't pay again" (the webhook still records it).
  | "verify";

export class RazorpayCheckoutError extends Error {
  constructor(
    public code: RazorpayCheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RazorpayCheckoutError";
  }
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayHandlerResponse) => void;
}

interface RazorpayFailedEvent {
  error?: { description?: string; reason?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (resp: RazorpayFailedEvent) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Allow a retry on the next attempt rather than caching the failure.
        scriptPromise = null;
        reject(
          new RazorpayCheckoutError(
            "unavailable",
            "Could not load the payment window.",
          ),
        );
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface RazorpayCheckoutResult {
  /** Rupees actually captured, as recorded server-side from the gateway. */
  amountPaid: number;
  /** The Razorpay payment id — the customer-facing payment reference. */
  paymentId: string;
}

export async function startRazorpayCheckout(opts: {
  bookingId: string;
  /** Rupees. */
  amount: number;
  /** Shown in the checkout modal, e.g. "Bhojpatra BHJ-12345". */
  note: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<RazorpayCheckoutResult> {
  await loadCheckoutScript();
  if (!window.Razorpay) {
    throw new RazorpayCheckoutError(
      "unavailable",
      "Could not load the payment window.",
    );
  }

  const orderRes = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: opts.bookingId,
      amount: opts.amount,
      customer: opts.customerName,
    }),
  });
  const order = (await orderRes.json().catch(() => null)) as {
    ok?: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    error?: string;
  } | null;
  if (!orderRes.ok || !order?.orderId || !order.keyId) {
    throw new RazorpayCheckoutError(
      "failed",
      order?.error ?? "Couldn't start the payment.",
    );
  }

  // The modal resolves through exactly one of: the success handler, or the
  // customer dismissing it. Failed attempts inside the modal don't settle the
  // promise (Razorpay offers retry in place); the last failure is remembered so
  // a close-after-failure reports WHY rather than a bare "closed".
  const callback = await new Promise<RazorpayHandlerResponse>(
    (resolve, reject) => {
      let lastFailure = "";
      const rzp = new window.Razorpay!({
        key: order.keyId!,
        order_id: order.orderId!,
        amount: order.amount ?? Math.round(opts.amount) * 100,
        currency: order.currency ?? "INR",
        name: "Bhojpatra",
        description: opts.note,
        prefill: {
          name: opts.customerName,
          email: opts.customerEmail,
          contact: opts.customerPhone,
        },
        notes: { bookingId: opts.bookingId },
        theme: { color: "#B92025" },
        modal: {
          ondismiss: () =>
            reject(
              lastFailure
                ? new RazorpayCheckoutError("failed", lastFailure)
                : new RazorpayCheckoutError("dismissed", "Checkout was closed."),
            ),
        },
        handler: (response) => resolve(response),
      });
      rzp.on("payment.failed", (resp) => {
        lastFailure =
          resp.error?.description ?? resp.error?.reason ?? "Payment failed.";
      });
      rzp.open();
    },
  );

  const verifyRes = await fetch("/api/payments/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: opts.bookingId,
      orderId: callback.razorpay_order_id,
      paymentId: callback.razorpay_payment_id,
      signature: callback.razorpay_signature,
      customer: opts.customerName,
    }),
  });
  const verified = (await verifyRes.json().catch(() => null)) as {
    ok?: boolean;
    payment?: { amount?: number };
    error?: string;
  } | null;
  if (!verifyRes.ok || !verified?.payment) {
    throw new RazorpayCheckoutError(
      "verify",
      verified?.error ?? "Couldn't confirm the payment.",
    );
  }

  return {
    amountPaid: verified.payment.amount ?? Math.round(opts.amount),
    paymentId: callback.razorpay_payment_id,
  };
}
