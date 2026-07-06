// Shared UPI helpers — used by checkout (client), the QR + payment API
// routes (server) and the admin payment settings. "Basic UPI" here means a
// real NPCI deep-link / QR against a merchant VPA: it genuinely opens the
// customer's UPI app prefilled with the amount. There is no payment gateway,
// so confirmation is manual (the customer taps "I've paid" after settling in
// their app).

export interface UpiPayeeConfig {
  /** Merchant Virtual Payment Address, e.g. `bhojpatra@hdfcbank`. */
  vpa: string;
  /** Payee name shown in the customer's UPI app. */
  payeeName: string;
  /**
   * Optional admin-uploaded static QR image, stored as a `data:image/...;base64`
   * URL. When set it's shown to customers at checkout *instead of* the QR we
   * generate from the VPA — this is how a merchant surfaces their own bank /
   * GPay / PhonePe QR. Absent (the default) means "use the generated QR".
   */
  qrImage?: string;
}

// Fallback merchant identity. The admin can override this at runtime via
// `/api/admin/payment-settings` (persisted to disk); checkout reads that and
// falls back to these defaults when nothing has been configured yet.
export const DEFAULT_MERCHANT: UpiPayeeConfig = {
  vpa: "bhojpatra@upi",
  payeeName: "Bhojpatra Catering",
};

// A UPI VPA is `handle@bank` — alphanumerics plus . - _ before the @, and a
// short alpha bank handle after it.
export const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

// A custom QR is stored inline as a base64 `data:image/...` URL (the admin
// uploads a PNG/JPEG/WebP/GIF of their own bank / GPay / PhonePe QR). Cap the
// string so the settings row stays small — a real static UPI QR is only a few
// KB, and ~600k base64 chars leaves generous headroom (~450 KB of image).
export const MAX_QR_IMAGE_CHARS = 600_000;
const QR_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function isValidQrImage(value: string): boolean {
  const s = value.trim();
  return s.length <= MAX_QR_IMAGE_CHARS && QR_IMAGE_RE.test(s);
}

export interface UpiIntentParams {
  vpa: string;
  payeeName: string;
  /** Amount in rupees. */
  amount: number;
  note?: string;
  txnRef?: string;
}

// Build an `upi://pay?...` deep-link per the NPCI URL spec. Encoded manually
// (not via URLSearchParams) so spaces become %20 rather than `+`, which some
// UPI apps mishandle.
export function buildUpiUri({
  vpa,
  payeeName,
  amount,
  note,
  txnRef,
}: UpiIntentParams): string {
  const parts = [
    `pa=${encodeURIComponent(vpa)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount.toFixed(2)}`,
    `cu=INR`,
  ];
  if (txnRef) parts.push(`tr=${encodeURIComponent(txnRef)}`);
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join("&")}`;
}

// Deterministic, human-readable transaction reference from a booking id +
// payment type (no random/time so it stays idempotent on retry).
export function upiTxnRef(bookingId: string, type: string): string {
  return `${bookingId}-${type}`.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
}

// The customer-entered UPI transaction reference — the UTR / reference number
// the payer's OWN app shows after settling. Captured at checkout (before the
// booking is confirmed) so the team can reconcile the transfer against the bank
// statement. Distinct from the merchant-side `upiTxnRef` embedded in the QR.
// Normalise (drop spaces / hyphens, uppercase) so the same reference is stored
// and matched consistently however the customer types it.
export function normalizeTxnId(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

// A 12-digit UPI UTR / RRN is the norm; some bank apps show a slightly longer
// alphanumeric reference. Accept 6–24 alphanumerics after normalising so a real
// reference passes while blanks / obvious junk are rejected.
export function isValidTxnId(raw: string): boolean {
  return /^[A-Z0-9]{6,24}$/.test(normalizeTxnId(raw));
}
