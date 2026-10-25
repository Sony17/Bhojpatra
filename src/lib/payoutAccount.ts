/**
 * Vendor payout account — where Bhojpatra sends a caterer's advance and
 * settlement money. Captured in onboarding Step 2 next to the statutory KYC,
 * stored on the vendor application (admin-only) and shown to the admin beside
 * every payout in Settlements.
 *
 * Every field is OPTIONAL — a vendor can give a bank account, a UPI ID, a UPI
 * QR code image (uploaded as KYC doc `upiQr`), any mix, or nothing yet. What
 * is entered must be well-formed (IFSC shape, 9–18 digit account, matching
 * confirm, valid VPA). Bank name / branch are filled from the IFSC (Razorpay's
 * public IFSC directory) but stay editable. Never reaches a customer surface.
 *
 * Framework-free so the wizard (client) and the submit route (server) share
 * the same rules.
 */

export const PAYOUT_ACCOUNT_TYPES = ["Savings", "Current"] as const;
export type PayoutAccountType = (typeof PAYOUT_ACCOUNT_TYPES)[number];

export interface VendorPayoutAccount {
  holderName?: string;
  accountNumber?: string;
  ifsc?: string;
  accountType?: PayoutAccountType;
  bankName?: string;
  branch?: string;
  upiId?: string;
}

/** IFSC: 4 bank letters, a 0, then a 6-character branch code. */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** Indian bank account numbers run 9–18 digits. */
export const ACCOUNT_NUMBER_RE = /^\d{9,18}$/;
/** UPI VPA, e.g. `annapurna@okhdfcbank` / `9876543210@ybl`. */
export const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export const normalizeIfsc = (v: string) => v.replace(/\s/g, "").toUpperCase().slice(0, 11);
export const normalizeAccountNumber = (v: string) => v.replace(/\D/g, "").slice(0, 18);
export const normalizeUpi = (v: string) => v.trim().replace(/\s/g, "").slice(0, 100);

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Field-level problems with a payout account, keyed by field. Empty when OK.
 *  `confirmAccountNumber` is checked only when passed (the wizard does). */
export function payoutAccountErrors(
  raw: Partial<Record<keyof VendorPayoutAccount | "confirmAccountNumber", unknown>>,
): Partial<Record<keyof VendorPayoutAccount | "confirmAccountNumber", string>> {
  const e: Partial<Record<keyof VendorPayoutAccount | "confirmAccountNumber", string>> = {};
  // Nothing is required — only what's been typed is checked.
  const acct = normalizeAccountNumber(str(raw.accountNumber, 30));
  if (acct && !ACCOUNT_NUMBER_RE.test(acct)) e.accountNumber = "Account number must be 9–18 digits.";
  if (
    acct &&
    raw.confirmAccountNumber !== undefined &&
    normalizeAccountNumber(str(raw.confirmAccountNumber, 30)) !== acct
  ) {
    e.confirmAccountNumber = "Account numbers don't match.";
  }
  const ifsc = normalizeIfsc(str(raw.ifsc, 20));
  if (ifsc && !IFSC_RE.test(ifsc)) e.ifsc = "Invalid IFSC (e.g. HDFC0001234).";
  if (raw.accountType && !PAYOUT_ACCOUNT_TYPES.includes(raw.accountType as PayoutAccountType)) {
    e.accountType = "Choose Savings or Current.";
  }
  const upi = normalizeUpi(str(raw.upiId, 120));
  if (upi && !UPI_RE.test(upi)) e.upiId = "Invalid UPI ID (e.g. name@okhdfcbank).";
  return e;
}

/** Shape a payout account, keeping only well-formed fields. Lenient by design
 *  (wizard drafts save half-filled forms); strict checks are
 *  {@link payoutAccountErrors}. */
export function cleanPayoutAccount(v: unknown): VendorPayoutAccount | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const raw = v as Record<string, unknown>;
  const holderName = str(raw.holderName, 100);
  const accountNumber = normalizeAccountNumber(str(raw.accountNumber, 30));
  const ifsc = normalizeIfsc(str(raw.ifsc, 20));
  const accountType = PAYOUT_ACCOUNT_TYPES.includes(raw.accountType as PayoutAccountType)
    ? (raw.accountType as PayoutAccountType)
    : undefined;
  const bankName = str(raw.bankName, 100);
  const branch = str(raw.branch, 120);
  const upiId = normalizeUpi(str(raw.upiId, 120));
  const out: VendorPayoutAccount = {
    ...(holderName ? { holderName } : {}),
    ...(accountNumber ? { accountNumber } : {}),
    ...(ifsc ? { ifsc } : {}),
    ...(accountType ? { accountType } : {}),
    ...(bankName ? { bankName } : {}),
    ...(branch ? { branch } : {}),
    ...(upiId ? { upiId } : {}),
  };
  return Object.keys(out).length ? out : undefined;
}

/** Parse a submitted payout account: format-checks what was entered.
 *  `value` is undefined when the vendor left the whole card empty. */
export function parsePayoutAccount(
  v: unknown,
): { ok: true; value: VendorPayoutAccount | undefined } | { ok: false; error: string } {
  const raw = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const first = Object.values(payoutAccountErrors(raw))[0];
  if (first) return { ok: false, error: first };
  return { ok: true, value: cleanPayoutAccount(raw) };
}

/** True when the account carries bank details (vs UPI only / nothing). */
export const hasBankDetails = (a: VendorPayoutAccount | undefined) =>
  Boolean(a?.accountNumber || a?.ifsc);

/** "XXXXXX1234" — safe for emails and logs. */
export function maskAccountNumber(n: string): string {
  return n.length > 4 ? `${"X".repeat(Math.min(n.length - 4, 8))}${n.slice(-4)}` : n;
}

/** The review-document number for a payout account: changing the account OR
 *  the IFSC sends it back to Pending for the admin to re-check. */
export function payoutDocNumber(a: Pick<VendorPayoutAccount, "accountNumber" | "ifsc">): string {
  return [a.accountNumber, a.ifsc].filter(Boolean).join(" · ");
}
