// Server-side re-pricing of a Single Stall order.
//
// The wizard sends the total it computed, but the server must never take that
// number on trust — a doctored request could book a stall for ₹1 and pay a 10%
// advance on that. So the order POST also carries the *inputs* (which stall,
// which dishes, which extras, which coupon) and this module rebuilds the total
// from our own data with the very same ladder the wizard uses
// (`computeOrderTotals`), so the two can only disagree when something was
// tampered with or a price changed under the guest.

import {
  addOns,
  servicePackages,
  type ServicePackage,
} from "@/lib/data";
import { assembleMenuCategories } from "@/lib/vendorMenus";
import { readSingleton } from "@/lib/store";
import { computeOrderTotals } from "@/lib/bookingPricing";
import { readCoupons } from "@/lib/coupons";
import { adminCoupons as SEED_COUPONS } from "@/lib/admin/mockData";
import { couponUsable, istTodayISO, type CouponTerms } from "@/lib/bookingRules";
import {
  DEFAULT_REFERRAL_RATES,
  normalizeReferralRates,
  type ReferralRates,
} from "@/lib/referralRates";

/** What the wizard billed — the shape mirrors its own state. */
export interface StallPricingClaim {
  stallId: string;
  /** course id → the dish ids actually billed on it (a fixed course carries
   *  its whole spread when taken, nothing when not). */
  picks: Record<string, string[]>;
  addOnIds: string[];
  serviceId: string;
  /** Venue booking fee as quoted on the venue's own page. Only ever adds to
   *  the bill, so it is accepted as claimed (clamped to ≥ 0). */
  venueFee: number;
  couponCode: string;
}

/** Narrow an untrusted body field to a claim, or null when it isn't one. */
export function parseStallPricingClaim(raw: unknown): StallPricingClaim | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.stallId !== "string" || !r.stallId.trim()) return null;
  const picks: Record<string, string[]> = {};
  if (r.picks && typeof r.picks === "object") {
    for (const [cat, ids] of Object.entries(r.picks as Record<string, unknown>)) {
      if (Array.isArray(ids))
        picks[cat] = ids.filter((x): x is string => typeof x === "string");
    }
  }
  const fee = Number(r.venueFee);
  return {
    stallId: r.stallId.trim(),
    picks,
    addOnIds: Array.isArray(r.addOnIds)
      ? r.addOnIds.filter((x): x is string => typeof x === "string")
      : [],
    serviceId: typeof r.serviceId === "string" ? r.serviceId : "",
    venueFee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    couponCode: typeof r.couponCode === "string" ? r.couponCode.trim() : "",
  };
}

/** Admin-configured service packages (same singleton `/api/admin/services`
 *  serves the wizard), falling back to the seed list. */
async function readServices(): Promise<ServicePackage[]> {
  const stored = await readSingleton<{ services: ServicePackage[] }>(
    "services",
  ).catch(() => null);
  const list = stored?.services;
  return Array.isArray(list) && list.length ? list : servicePackages;
}

/** Live referral percentages — the same singleton the wizard reads. */
export async function readReferralRates(): Promise<ReferralRates> {
  const stored = await readSingleton<ReferralRates>("referral").catch(
    () => null,
  );
  return normalizeReferralRates(stored ?? DEFAULT_REFERRAL_RATES);
}

/** The admin Coupon Manager's codes (the `coupons` table) — the same list
 *  `/api/coupons/public` offers the wizard. An empty table reads as the seed
 *  list without writing it (seeding is the admin console's job). */
export async function readCouponTerms(): Promise<CouponTerms[]> {
  const rows = await readCoupons().catch(() => []);
  return rows.length ? rows : SEED_COUPONS;
}

/** Resolve a typed coupon code against the live coupon table and its rules
 *  (active, inside its dates, eligible for this occasion / first booking).
 *  `coupon` is null with a customer-facing `error` when it can't be used. */
export async function resolveCoupon(
  code: string,
  ctx: { occasion: string; isFirstBooking: boolean; now?: Date },
): Promise<{ coupon: CouponTerms | null; error?: string }> {
  const key = code.trim().toUpperCase();
  if (!key) return { coupon: null };
  const found = (await readCouponTerms()).find(
    (c) => c.code.trim().toUpperCase() === key,
  );
  if (!found) {
    return { coupon: null, error: "That coupon code isn't valid." };
  }
  const check = couponUsable(found, {
    todayISO: istTodayISO(ctx.now),
    occasion: ctx.occasion,
    isFirstBooking: ctx.isFirstBooking,
  });
  return check.ok
    ? { coupon: found }
    : { coupon: null, error: check.reason };
}

/** The stall's per-plate for the claimed picks, from the live menu roster —
 *  a set-menu course bills its rate once when taken, a varied one dish by
 *  dish (`price ?? perPlate`). Only moderation-Approved vendors are on the
 *  roster, so an unapproved stall reads as missing. Null when no such stall
 *  is on the roster; `categoryIds` lists the courses actually billed. */
async function stallPerPlate(
  claim: StallPricingClaim,
): Promise<{ perPlate: number; categoryIds: string[] } | null> {
  const categories = await assembleMenuCategories();
  let found = false;
  let perPlate = 0;
  const categoryIds: string[] = [];
  for (const cat of categories) {
    const v = cat.vendors.find((x) => x.id === claim.stallId && x.items.length);
    if (!v) continue;
    found = true;
    // Only dish ids that really are on this course count as picks.
    const picks = (claim.picks[cat.id] ?? []).filter((id) =>
      v.items.some((it) => it.id === id),
    );
    if (picks.length > 0) categoryIds.push(cat.id);
    if (v.menuType !== "varied") {
      if (picks.length > 0) perPlate += v.perPlate;
      continue;
    }
    perPlate += v.items
      .filter((it) => picks.includes(it.id))
      .reduce((s, it) => s + (it.price ?? v.perPlate), 0);
  }
  return found ? { perPlate, categoryIds } : null;
}

export interface StallQuote {
  grandTotal: number;
  /** The per-plate the menu picks bill at. 0 means nothing was picked. */
  perPlate: number;
  /** Courses actually billed — what the vendor's per-course minimums read. */
  categoryIds: string[];
}

/**
 * Rebuild a Single Stall order's grand total from our own data — menu,
 * head-count, add-ons, service package, the (already validated) coupon and
 * the referral discount. Null when the stall isn't on the booking roster at
 * all (so the caller can say so rather than report a price mismatch).
 */
export async function expectedStallTotal(
  claim: StallPricingClaim,
  guests: number,
  referralPercent: number,
  coupon: Pick<CouponTerms, "percent" | "cap"> | null,
): Promise<StallQuote | null> {
  const menu = await stallPerPlate(claim);
  if (menu === null) return null;
  const { perPlate, categoryIds } = menu;

  const addOnsTotal = addOns
    .filter((a) => claim.addOnIds.includes(a.id))
    .reduce((sum, a) => sum + (a.perPlate ? a.price * guests : a.price), 0);

  const service = claim.serviceId
    ? (await readServices()).find((s) => s.id === claim.serviceId)
    : undefined;
  const serviceTotal = service
    ? service.perPlate
      ? service.priceMin * guests
      : service.priceMin
    : 0;

  const { grandTotal } = computeOrderTotals({
    subtotal: perPlate * guests,
    addOnsTotal,
    venueFee: claim.venueFee,
    serviceTotal,
    coupon: coupon ? { percent: coupon.percent, cap: coupon.cap } : null,
    referralPercent,
  });
  return { grandTotal, perPlate, categoryIds };
}
