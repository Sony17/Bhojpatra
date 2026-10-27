/**
 * Admin-configurable vendor advance payout.
 *
 * Before an event, Bhojpatra can release part of a caterer's payout up front so
 * they can buy stock. The admin sets ONE rule for how big that advance is:
 *
 *  • `percent` — a % of the booking value (e.g. 30 → 30% of the order amount)
 *  • `amount`  — a flat ₹ figure per booking (e.g. 5000)
 *
 * Either way the advance never exceeds the booking value itself. Whatever is
 * paid as an advance comes off that booking's balance in the period settlement
 * after the event is Completed (see `@/lib/settlements`).
 *
 * The payout itself is made outside the app (Razorpay dashboard / UPI / bank
 * transfer) and recorded here with its reference — this module only computes
 * the suggested number. Defaults to off (0%) so nothing changes until an admin
 * configures it.
 *
 * Framework-free so it runs on the client (the Settlements console) and the
 * server (the settings + payout routes' validation).
 */

export type VendorAdvanceMode = "percent" | "amount";

export interface VendorAdvanceRule {
  mode: VendorAdvanceMode;
  /** Percentage (0–100) in `percent` mode, whole rupees in `amount` mode. */
  value: number;
}

/** How the admin paid the advance out — recorded for audit, never charged. */
export const VENDOR_PAYOUT_METHODS = ["Razorpay", "UPI", "Bank Transfer", "Cash"] as const;
export type VendorPayoutMethod = (typeof VENDOR_PAYOUT_METHODS)[number];

export const MAX_ADVANCE_PERCENT = 100;
/** Sanity ceiling on a flat advance (₹10 lakh) — guards a fat-finger. */
export const MAX_ADVANCE_AMOUNT = 1_000_000;

export const DEFAULT_VENDOR_ADVANCE_RULE: VendorAdvanceRule = {
  mode: "percent",
  value: 0,
};

/** Settings-singleton key the rule persists under (`settings` table). */
export const VENDOR_ADVANCE_SETTINGS_KEY = "vendorAdvance";

/** Validate a raw rule. Returns an error message, or null when it's usable. */
export function vendorAdvanceRuleError(raw: unknown): string | null {
  const src = (raw ?? {}) as Partial<Record<keyof VendorAdvanceRule, unknown>>;
  if (src.mode !== "percent" && src.mode !== "amount") {
    return "Choose percentage or fixed amount.";
  }
  const n = Number(src.value);
  if (src.value === "" || src.value == null || !Number.isFinite(n) || n < 0) {
    return "Enter a value of 0 or more.";
  }
  if (src.mode === "percent" && n > MAX_ADVANCE_PERCENT) {
    return `Enter a percentage between 0 and ${MAX_ADVANCE_PERCENT}.`;
  }
  if (src.mode === "amount" && n > MAX_ADVANCE_AMOUNT) {
    return "That amount is too large for a single advance.";
  }
  return null;
}

/** Merge a stored/partial blob onto the default, clamping the value. */
export function normalizeVendorAdvanceRule(raw: unknown): VendorAdvanceRule {
  const src = (raw ?? {}) as Partial<Record<keyof VendorAdvanceRule, unknown>>;
  const mode: VendorAdvanceMode = src.mode === "amount" ? "amount" : "percent";
  const n = Number(src.value);
  const cap = mode === "percent" ? MAX_ADVANCE_PERCENT : MAX_ADVANCE_AMOUNT;
  const value = Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), cap) : 0;
  return { mode, value };
}

/** The suggested advance for one booking under the rule, in whole rupees —
 *  never more than the booking value. */
export function vendorAdvanceFor(rule: VendorAdvanceRule, bookingAmount: number): number {
  const total = Math.max(0, Math.round(Number(bookingAmount) || 0));
  const raw =
    rule.mode === "percent" ? Math.round((total * rule.value) / 100) : rule.value;
  return Math.min(Math.max(0, raw), total);
}

/** Human label for the rule, e.g. "30% of booking value" / "₹5,000 per booking". */
export function describeVendorAdvanceRule(rule: VendorAdvanceRule): string {
  if (rule.value <= 0) return "Off";
  return rule.mode === "percent"
    ? `${rule.value}% of booking value`
    : `₹${rule.value.toLocaleString("en-IN")} per booking`;
}
