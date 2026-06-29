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
