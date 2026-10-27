// Server-side Razorpay helpers — order creation, checkout-signature and
// webhook-signature verification. Talks to the Razorpay REST API directly
// (basic auth) so there's no SDK dependency. Import only from route handlers;
// the key secret must never reach the client.
//
// Configuration is env-only:
//   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — API keypair (test or live).
//   RAZORPAY_WEBHOOK_SECRET — the secret set on the dashboard webhook.
//   RAZORPAYX_ACCOUNT_NUMBER — the RazorpayX business account vendor payouts
//     are debited from (RazorpayX → Account details). Same API keypair.
//   RAZORPAYX_WEBHOOK_SECRET — the RazorpayX payouts webhook's secret
//     (falls back to RAZORPAY_WEBHOOK_SECRET).
// With the keypair absent the gateway is simply off and checkout falls back to
// the manual UPI flow.

import { createHmac, timingSafeEqual } from "crypto";
import { logPaymentEvent, newApiEventId, summarize } from "@/lib/paymentEvents";

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
  notes?: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  /** Paise. */
  amount: number;
  currency: string;
  status: string;
  method?: string;
  /** Paise refunded so far (cumulative across partial refunds). */
  amount_refunded?: number;
  notes?: Record<string, string>;
}

// Every call is logged (server log + payment_events table) with its status,
// duration and a PII-free summary of the response — success and failure alike.
async function razorpayRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const method = init?.method ?? "GET";
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: authHeader(),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
      // A hung gateway must not hang checkout — fail after 20s.
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    // Network failure or timeout — no HTTP response at all.
    await logPaymentEvent({
      id: newApiEventId(),
      kind: "api",
      createdAt: new Date().toISOString(),
      method,
      path,
      durationMs: Date.now() - started,
      ok: false,
      summary: {
        error_description:
          err instanceof Error ? `${err.name}: ${err.message}` : "network error",
      },
    });
    throw new Error("Couldn't reach Razorpay. Please try again.");
  }

  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { description?: string } })
    | null;
  await logPaymentEvent({
    id: newApiEventId(),
    kind: "api",
    createdAt: new Date().toISOString(),
    method,
    path,
    httpStatus: res.status,
    durationMs: Date.now() - started,
    ok: res.ok && Boolean(data),
    summary: summarize(data),
  });

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

/** Fetch an order — used to recover the booking ref from the order's notes
 *  when a webhook's payment entity doesn't carry it. */
export async function fetchRazorpayOrder(
  orderId: string,
): Promise<RazorpayOrder> {
  return razorpayRequest<RazorpayOrder>(
    `/orders/${encodeURIComponent(orderId)}`,
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
  secret = razorpayWebhookSecret(),
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/* ── RazorpayX payouts (money OUT to vendors) ─────────────────────────────── */

export function razorpayXAccountNumber(): string {
  return (process.env.RAZORPAYX_ACCOUNT_NUMBER ?? "").replace(/\s/g, "");
}

/** Vendor payouts are on only with the keypair AND a RazorpayX account. */
export function isRazorpayXConfigured(): boolean {
  return isRazorpayConfigured() && Boolean(razorpayXAccountNumber());
}

export function razorpayXWebhookSecret(): string {
  return (process.env.RAZORPAYX_WEBHOOK_SECRET ?? "").trim() || razorpayWebhookSecret();
}

export interface RazorpayXContact {
  id: string;
}

export interface RazorpayXFundAccount {
  id: string;
  active?: boolean;
}

export type RazorpayXPayoutMode = "IMPS" | "NEFT" | "RTGS" | "UPI";

export interface RazorpayXPayout {
  id: string;
  /** Paise. */
  amount: number;
  /** queued · pending · processing · processed · reversed · cancelled · rejected · failed */
  status: string;
  mode?: string;
  utr?: string | null;
  reference_id?: string | null;
  failure_reason?: string | null;
  status_details?: { description?: string | null; reason?: string | null } | null;
}

export async function createRazorpayXContact(opts: {
  name: string;
  email?: string;
  phone?: string;
  referenceId: string;
}): Promise<RazorpayXContact> {
  return razorpayRequest<RazorpayXContact>("/contacts", {
    method: "POST",
    body: {
      name: opts.name.slice(0, 50),
      type: "vendor",
      reference_id: opts.referenceId.slice(0, 40),
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.phone ? { contact: opts.phone } : {}),
    },
  });
}

export async function createRazorpayXFundAccount(
  contactId: string,
  target:
    | { kind: "bank"; name: string; ifsc: string; accountNumber: string }
    | { kind: "upi"; vpa: string },
): Promise<RazorpayXFundAccount> {
  return razorpayRequest<RazorpayXFundAccount>("/fund_accounts", {
    method: "POST",
    body:
      target.kind === "bank"
        ? {
            contact_id: contactId,
            account_type: "bank_account",
            bank_account: {
              name: target.name.slice(0, 120),
              ifsc: target.ifsc,
              account_number: target.accountNumber,
            },
          }
        : { contact_id: contactId, account_type: "vpa", vpa: { address: target.vpa } },
  });
}

/** Send a payout. `idempotencyKey` makes a retried request (network blip,
 *  double click) return the same payout instead of paying twice. */
export async function createRazorpayXPayout(opts: {
  fundAccountId: string;
  amountRupees: number;
  mode: RazorpayXPayoutMode;
  referenceId: string;
  narration: string;
  idempotencyKey: string;
  notes?: Record<string, string>;
}): Promise<RazorpayXPayout> {
  return razorpayRequest<RazorpayXPayout>("/payouts", {
    method: "POST",
    headers: { "X-Payout-Idempotency": opts.idempotencyKey },
    body: {
      account_number: razorpayXAccountNumber(),
      fund_account_id: opts.fundAccountId,
      amount: Math.round(opts.amountRupees) * 100,
      currency: "INR",
      mode: opts.mode,
      purpose: "vendor bill",
      // Wait for a top-up instead of failing when the balance is short.
      queue_if_low_balance: true,
      reference_id: opts.referenceId.slice(0, 40),
      // Shown on the vendor's bank statement — alphanumerics + spaces, ≤30.
      narration: opts.narration.replace(/[^a-zA-Z0-9 ]/g, " ").slice(0, 30).trim(),
      ...(opts.notes ? { notes: opts.notes } : {}),
    },
  });
}

export async function fetchRazorpayXPayout(payoutId: string): Promise<RazorpayXPayout> {
  return razorpayRequest<RazorpayXPayout>(`/payouts/${encodeURIComponent(payoutId)}`);
}
