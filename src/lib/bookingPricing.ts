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

export interface FeastPricingInput {
  bookingType?: "feast";
  packageId: string;
  guests: number;
  categoryVendors?: Record<string, string[]>;
  selectedAddOns?: string[];
  serviceId?: string;
  venueFee?: number;
  coupon?: { percent: number; cap: number } | null;
  referralPercent?: number;
}

export interface StallPricingInput {
  bookingType: "stall";
  packageId?: "custom";
  stallId?: string;
  categoryItems?: Record<string, string[]>;
  guests: number;
  selectedAddOns?: string[];
  serviceId?: string;
  venueFee?: number;
  coupon?: { percent: number; cap: number } | null;
  referralPercent?: number;
}

export interface BainaPricingInput {
  bookingType: "baina";
  bainaVendorId?: string;
  bainaItems: Array<{ id: string; qty: number; price?: number }>;
}

export interface VenuePricingInput {
  bookingType: "venue";
  venueId?: string;
  venueRate?: number;
  spaceRates?: number;
  slotRate?: number;
  serviceRate?: number;
  addOnsRate?: number;
  discount?: number;
}

export type NormalizedPricingInput =
  | FeastPricingInput
  | StallPricingInput
  | BainaPricingInput
  | VenuePricingInput;

import {
  packageBasePerPlate,
  packageCategories,
  menuCategories,
  addOns,
  servicePackages,
} from "@/lib/data";
import { BAINA_BOX_VENDOR_DATA } from "@/lib/bainaBoxData";

/**
 * Checks whether a client-submitted amount differs materially from the server-calculated
 * amount. Allows up to 1 rupee rounding tolerance.
 */
export function isMaterialDifference(
  clientAmt: number,
  serverAmt: number,
  maxTolerance = 1,
): boolean {
  if (!Number.isFinite(clientAmt) || !Number.isFinite(serverAmt)) return true;
  return Math.abs(clientAmt - serverAmt) > maxTolerance;
}

/**
 * Authoritatively calculates Feast totals on the server from raw catalog data.
 */
export function calculateFeastTotals(input: FeastPricingInput): OrderTotals {
  const guests = Math.max(
    1,
    Math.min(MAX_GUESTS, Math.round(input.guests || MIN_GUESTS)),
  );
  const basePerPlate = packageBasePerPlate[input.packageId] ?? 0;

  let categoryAddTotal = 0;
  const activeCatIds =
    packageCategories[input.packageId] ?? Object.keys(input.categoryVendors ?? {});

  if (input.categoryVendors) {
    for (const catId of activeCatIds) {
      const cat = menuCategories.find((c) => c.id === catId);
      if (!cat) continue;
      const vendorIds = input.categoryVendors[catId] ?? [];
      for (const vid of vendorIds) {
        const v = cat.vendors.find((item) => item.id === vid);
        if (v && Number.isFinite(v.perPlate)) {
          categoryAddTotal += v.perPlate;
        }
      }
    }
  }

  const perPlate = basePerPlate + categoryAddTotal;
  const subtotal = perPlate * guests;

  let addOnsTotal = 0;
  if (Array.isArray(input.selectedAddOns)) {
    for (const aid of input.selectedAddOns) {
      const item = addOns.find((a) => a.id === aid);
      if (item && Number.isFinite(item.price)) {
        addOnsTotal += item.perPlate ? item.price * guests : item.price;
      }
    }
  }

  let serviceTotal = 0;
  if (input.serviceId) {
    const s = servicePackages.find((pkg) => pkg.id === input.serviceId);
    if (s && Number.isFinite(s.priceMin)) {
      serviceTotal = s.perPlate ? s.priceMin * guests : s.priceMin;
    }
  }

  const venueFee = Math.max(0, input.venueFee ?? 0);

  return computeOrderTotals({
    subtotal,
    addOnsTotal,
    venueFee,
    serviceTotal,
    coupon: input.coupon,
    referralPercent: input.referralPercent ?? 0,
  });
}

/**
 * Authoritatively calculates Single Stall totals.
 */
export function calculateStallTotals(input: StallPricingInput): OrderTotals {
  const guests = Math.max(
    1,
    Math.min(MAX_GUESTS, Math.round(input.guests || MIN_GUESTS)),
  );

  let perPlate = 0;
  if (input.stallId) {
    for (const cat of menuCategories) {
      const v = cat.vendors.find((ven) => ven.id === input.stallId);
      if (v) {
        if (Number.isFinite(v.perPlate)) {
          perPlate = v.perPlate;
          if (input.categoryItems && v.items && v.items.length > 0) {
            const pickedDishIds = Object.values(input.categoryItems).flat();
            const customDishSum = v.items
              .filter(
                (it) =>
                  pickedDishIds.includes(it.id) &&
                  it.price != null &&
                  it.price > 0,
              )
              .reduce((acc, it) => acc + (it.price ?? 0), 0);
            if (customDishSum > 0) {
              perPlate = customDishSum;
            }
          }
        }
        break;
      }
    }
  }

  const subtotal = perPlate * guests;

  let addOnsTotal = 0;
  if (Array.isArray(input.selectedAddOns)) {
    for (const aid of input.selectedAddOns) {
      const item = addOns.find((a) => a.id === aid);
      if (item && Number.isFinite(item.price)) {
        addOnsTotal += item.perPlate ? item.price * guests : item.price;
      }
    }
  }

  let serviceTotal = 0;
  if (input.serviceId) {
    const s = servicePackages.find((pkg) => pkg.id === input.serviceId);
    if (s && Number.isFinite(s.priceMin)) {
      serviceTotal = s.perPlate ? s.priceMin * guests : s.priceMin;
    }
  }

  const venueFee = Math.max(0, input.venueFee ?? 0);

  return computeOrderTotals({
    subtotal,
    addOnsTotal,
    venueFee,
    serviceTotal,
    coupon: input.coupon,
    referralPercent: input.referralPercent ?? 0,
  });
}

/**
 * Authoritatively calculates Baina Box totals.
 */
export function calculateBainaTotals(input: BainaPricingInput): {
  subtotal: number;
  grandTotal: number;
} {
  let subtotal = 0;
  const vendor =
    (input.bainaVendorId && BAINA_BOX_VENDOR_DATA[input.bainaVendorId]) ||
    Object.values(BAINA_BOX_VENDOR_DATA).find(
      (v) => v.vendorId === input.bainaVendorId || v.slug === input.bainaVendorId,
    );

  for (const item of input.bainaItems || []) {
    const qty = Math.max(0, Math.round(item.qty || 0));
    if (qty <= 0) continue;
    let unitPrice = item.price ?? 0;
    if (vendor) {
      const product = vendor.products.find((p) => p.id === item.id);
      if (product && Number.isFinite(product.price)) {
        unitPrice = product.price;
      }
    }
    subtotal += qty * unitPrice;
  }

  return {
    subtotal,
    grandTotal: subtotal,
  };
}

/**
 * Authoritatively calculates Venue booking totals.
 */
export function calculateVenueTotals(input: VenuePricingInput): OrderTotals {
  const preDiscount = Math.max(
    0,
    (input.venueRate ?? 0) +
      (input.spaceRates ?? 0) +
      (input.slotRate ?? 0) +
      (input.serviceRate ?? 0) +
      (input.addOnsRate ?? 0),
  );
  const discount = Math.max(0, Math.min(input.discount ?? 0, preDiscount));
  const taxable = preDiscount - discount;
  const gst = taxable * GST_RATE;
  return {
    preDiscount,
    couponDiscount: 0,
    referralDiscount: 0,
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
