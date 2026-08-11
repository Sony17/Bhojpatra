/** Shared booking money ladder.
 *
 *  Both booking flows — the tiered feast wizard (`/book`) and the Single Stall
 *  wizard (`/book/stall`) — price an order the same way once the menu total is
 *  known: catering subtotal + extras, less coupon/referral, plus the untaxed-by-
 *  coupon venue fee and service package, then 18% GST. Only the *menu* differs
 *  (per-vendor uplift on a tier, per-dish on a single stall), so that number is
 *  an input here rather than something this module derives.
 *
 *  Keep this the single source for the rates and the ladder — a second copy is
 *  how the two flows start quoting different totals for the same basket.
 */

export const MIN_GUESTS = 50;
export const MAX_GUESTS = 50_000;

export const GST_RATE = 0.18;

/** Advance booking fee — guests lock a date by paying this share of the grand
 *  total up front; the balance is settled later (in full or over EMIs). */
export const ADVANCE_RATE = 0.1;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Whole days from today (local midnight) until a `YYYY-MM-DD` date.
 *  Returns null for an empty/invalid date. */
export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** `YYYY-MM-DD` → e.g. "12 Dec 2026" (matches the My Bookings list style). */
export function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr || "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** The soonest bookable `YYYY-MM-DD` given a lead time in days — used to spell
 *  out the requirement in a notice when the chosen date falls short. */
export function isoAfterDays(lead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + lead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface OrderTotalsInput {
  /** Catering base × guests — the menu's own contribution to the bill. */
  subtotal: number;
  /** Selected add-ons / counters (already scaled by head-count where per-plate). */
  addOnsTotal: number;
  /** Venue booking fee. Taxed, but never coupon-discounted. */
  venueFee: number;
  /** Feast-wide service package. Taxed, but never coupon-discounted. */
  serviceTotal: number;
  /** Applied coupon, if any — percent off the catering base, capped in rupees. */
  coupon?: { percent: number; cap: number } | null;
  /** Customer-side referral discount as a percent of the catering base. */
  referralPercent?: number;
}

export interface OrderTotals {
  preDiscount: number;
  couponDiscount: number;
  referralDiscount: number;
  discount: number;
  taxable: number;
  gst: number;
  grandTotal: number;
}

/** The full ladder from a priced basket to the grand total. Coupon and referral
 *  both come off the catering base only (`subtotal + addOns`); the venue fee and
 *  service package join afterwards and are taxed alongside everything else. */
export function computeOrderTotals({
  subtotal,
  addOnsTotal,
  venueFee,
  serviceTotal,
  coupon,
  referralPercent = 0,
}: OrderTotalsInput): OrderTotals {
  const preDiscount = subtotal + addOnsTotal;
  const couponDiscount = coupon
    ? Math.min((preDiscount * coupon.percent) / 100, coupon.cap)
    : 0;
  // Stacks with a coupon but never takes off more than what's left of the base.
  const referralDiscount = Math.max(
    0,
    Math.min(
      Math.round((preDiscount * referralPercent) / 100),
      preDiscount - couponDiscount,
    ),
  );
  const discount = couponDiscount + referralDiscount;
  const taxable = preDiscount - discount + venueFee + serviceTotal;
  const gst = taxable * GST_RATE;
  return {
    preDiscount,
    couponDiscount,
    referralDiscount,
    discount,
    taxable,
    gst,
    grandTotal: taxable + gst,
  };
}

/** Deterministic booking id derived from the order itself (no random / clock),
 *  so re-rendering the confirm step never renumbers a booking mid-flow. */
export function deriveBookingId(
  guests: number,
  grandTotal: number,
  itemCount: number,
): string {
  return `BHJ-${(
    ((guests * 7 + Math.round(grandTotal) + itemCount * 13) % 90000) +
    10000
  ).toString()}`;
}
