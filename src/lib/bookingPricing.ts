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

/** A fresh random salt for one booking session — create it ONCE per visit
 *  (lazy `useState`) and pass it to `bookingRef`. It is what keeps two
 *  customers placing an identical order from landing on the same booking id
 *  (which used to merge their bookings and let the second one ride on the
 *  first one's payment). */
export function newBookingSalt(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** cyrb53 — a fast 53-bit string hash (plenty of room against collisions). */
function hash53(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Booking reference (`BHJ-` + 10 base-36 chars) derived from the session
 *  salt plus the order's content. Stable for the same order within one visit,
 *  so a double-tap or retry upserts the same record instead of duplicating it,
 *  and a changed order gets a new id — but unique across customers/visits. */
export function bookingRef(salt: string, seed: string, prefix = "BHJ-"): string {
  return (
    prefix +
    hash53(`${salt}|${seed}`).toString(36).toUpperCase().padStart(10, "0").slice(-10)
  );
}

/** Wizard booking id: the session salt + the order's shape. */
export function deriveBookingId(
  salt: string,
  guests: number,
  grandTotal: number,
  itemCount: number,
): string {
  return bookingRef(salt, `${guests}|${Math.round(grandTotal)}|${itemCount}`);
}
