// Server-side Razorpay helpers — order creation, checkout-signature and
// webhook-signature verification. Talks to the Razorpay REST API directly
// (basic auth) so there's no SDK dependency. Import only from route handlers;
// the key secret must never reach the client.
//
// Configuration is env-only:
//   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — API keypair (test or live).
//   RAZORPAY_WEBHOOK_SECRET — the secret set on the dashboard webhook.
// With the keypair absent the gateway is simply off and checkout falls back to
// the manual UPI flow.

import { createHmac, timingSafeEqual } from "crypto";

const API_BASE = "https://api.razorpay.com/v1";

export function razorpayKeyId(): string {
  return (process.env.RAZORPAY_KEY_ID ?? "").trim();
}

function razorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
}

function razorpayWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
}

/** Gateway is on only when the full API keypair is configured. */
export function isRazorpayConfigured(): boolean {
  return Boolean(razorpayKeyId() && razorpayKeySecret());
}

function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${razorpayKeyId()}:${razorpayKeySecret()}`).toString("base64")
  );
}

export interface RazorpayOrder {
  id: string;
  /** Paise. */
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  /** Paise. */
  amount: number;
  currency: string;
  status: string;
  method?: string;
}

async function razorpayRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: authHeader(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { description?: string } })
    | null;
  if (!res.ok || !data) {
    const description =
      data?.error?.description ?? `Razorpay request failed (${res.status})`;
    throw new Error(description);
  }
  return data;
}

/** Create an order for the advance. Amount in rupees; Razorpay wants paise. */
export async function createRazorpayOrder(opts: {
  amountRupees: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: {
      amount: Math.round(opts.amountRupees) * 100,
      currency: "INR",
      // Razorpay caps receipts at 40 chars.
      receipt: opts.receipt.slice(0, 40),
      notes: opts.notes,
      // Auto-capture on authorization, independent of the dashboard's capture
      // setting — an authorized-but-uncaptured payment is money we never get.
      payment_capture: 1,
    },
  });
}

/** Capture an authorized payment (amount in paise) — the backstop for when
 *  auto-capture didn't happen. Razorpay auto-refunds uncaptured funds. */
export async function captureRazorpayPayment(
  paymentId: string,
  amountPaise: number,
): Promise<RazorpayPayment> {
  return razorpayRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    { method: "POST", body: { amount: amountPaise, currency: "INR" } },
  );
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  /** Paise. */
  amount: number;
  status: string;
}

/** Refund a captured payment, fully or partially (amount in paise). The money
 *  moves back to the customer's original instrument in 5–7 working days. */
export async function refundRazorpayPayment(
  paymentId: string,
  amountPaise: number,
): Promise<RazorpayRefund> {
  return razorpayRequest<RazorpayRefund>(
    `/payments/${encodeURIComponent(paymentId)}/refund`,
    { method: "POST", body: { amount: amountPaise } },
  );
}

/** Fetch a payment so the recorded amount/order come from Razorpay, never the client. */
export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayPayment> {
  return razorpayRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}`,
  );
}

function safeEqualHex(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout callback authenticity: HMAC-SHA256(key_secret, "order_id|payment_id"). */
export function verifyCheckoutSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = razorpayKeySecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, opts.signature);
}

/** Webhook authenticity: HMAC-SHA256(webhook_secret, raw request body). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = razorpayWebhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
