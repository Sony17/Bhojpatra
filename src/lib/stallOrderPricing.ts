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
  coupons,
  servicePackages,
  type ServicePackage,
} from "@/lib/data";
import { assembleMenuCategories } from "@/lib/vendorMenus";
import { readSingleton } from "@/lib/store";
import { computeOrderTotals } from "@/lib/bookingPricing";
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

/** The stall's per-plate for the claimed picks, from the live menu roster —
 *  a set-menu course bills its rate once when taken, a varied one dish by
 *  dish (`price ?? perPlate`). Null when no such stall is on the roster. */
async function stallPerPlate(claim: StallPricingClaim): Promise<number | null> {
  const categories = await assembleMenuCategories();
  let found = false;
  let perPlate = 0;
  for (const cat of categories) {
    const v = cat.vendors.find((x) => x.id === claim.stallId && x.items.length);
    if (!v) continue;
    found = true;
    const picks = claim.picks[cat.id] ?? [];
    if (v.menuType !== "varied") {
      if (picks.length > 0) perPlate += v.perPlate;
      continue;
    }
    perPlate += v.items
      .filter((it) => picks.includes(it.id))
      .reduce((s, it) => s + (it.price ?? v.perPlate), 0);
  }
  return found ? perPlate : null;
}

/**
 * Rebuild a Single Stall order's grand total from our own data. Null when the
 * stall isn't on the booking roster at all (so the caller can say so rather
 * than report a price mismatch).
 */
export async function expectedStallTotal(
  claim: StallPricingClaim,
  guests: number,
  referralPercent: number,
): Promise<number | null> {
  const perPlate = await stallPerPlate(claim);
  if (perPlate === null) return null;

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

  const coupon = claim.couponCode
    ? coupons.find(
        (c) => c.code.toUpperCase() === claim.couponCode.toUpperCase(),
      )
    : undefined;

  return computeOrderTotals({
    subtotal: perPlate * guests,
    addOnsTotal,
    venueFee: claim.venueFee,
    serviceTotal,
    coupon: coupon ?? null,
    referralPercent,
  }).grandTotal;
}
