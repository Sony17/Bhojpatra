/**
 * Feast-band helpers — the one place that answers "what does this caterer serve
 * on Silver / Gold / Platinum?".
 *
 * A caterer publishes ONE menu per course and then bends it per band three ways:
 *   • `tierItems`    — how many dishes a guest picks from that course on a band
 *   • `tierPerPlate` — what that course costs per plate on a band
 *   • a dish's own `tiers` — which bands that dish is served on at all
 *
 * Every rule here is "unset means the platform default", so a caterer who never
 * opens the band editor behaves exactly as they did before any of this existed.
 *
 * Client-safe on purpose: the vendor dashboard, the /book wizard and the public
 * menu page all read these, so nothing here may touch the store or `crypto`
 * (that's `vendorMenus.ts`, which imports from here).
 */
import { TIER_ORDER, type VendorTier } from "@/lib/admin/types";

/** Marketplace bands a per-plate price falls into — the catalog's price-range
 *  filter, and the fallback for a caterer who never picked their own bands. */
export function tiersForPrice(priceFrom: number): VendorTier[] {
  if (priceFrom <= 999) return ["Silver", "Gold"];
  if (priceFrom <= 1250) return ["Silver", "Gold", "Platinum"];
  return ["Gold", "Platinum"];
}

/** The bands a caterer actually sells: their own selection when they made one,
 *  else the price-derived default. Both the dashboard (which bands to ask about)
 *  and the save path (which bands to keep data for) run off this, so a vendor is
 *  never asked about a band they don't sell — nor silently placed in one they
 *  can't configure. */
export function effectiveTiers(
  tiers: readonly VendorTier[] | undefined,
  priceFrom: number,
): VendorTier[] {
  return tiers?.length
    ? TIER_ORDER.filter((t) => tiers.includes(t))
    : tiersForPrice(priceFrom);
}

/** Whether a dish is served on a band. No list on the dish = every band (the
 *  default, so an untouched menu is unchanged); off a band entirely — Single
 *  Stall, which browses one stall at its own rate — every dish is served. */
export function dishOnTier(
  item: { tiers?: readonly VendorTier[] },
  tier: VendorTier | null,
): boolean {
  if (!tier || !item.tiers?.length) return true;
  return item.tiers.includes(tier);
}

/** A course's per-plate rate on a band: the caterer's band rate when they set
 *  one, else their flat rate for the course. Off a band, always the flat rate. */
export function tierRate(
  section: {
    perPlate: number;
    tierPerPlate?: Partial<Record<VendorTier, number>>;
  },
  tier: VendorTier | null,
): number {
  const own = tier ? section.tierPerPlate?.[tier] : undefined;
  return own != null && own > 0 ? own : section.perPlate;
}

/** A caterer's own published dish quota for a course. Under a band that's the
 *  number they set for it; with no band — Single Stall browses every stall,
 *  unfiltered — it's the most generous quota they published, so `0` only reads
 *  as "I don't serve this course" when they put 0 on every band. `undefined` =
 *  never set one, so the platform quota applies. */
export function ownCourseQuota(
  tierItems: Partial<Record<VendorTier, number>> | undefined,
  tier: VendorTier | null,
): number | undefined {
  if (!tierItems) return undefined;
  if (tier) return tierItems[tier];
  const set = Object.values(tierItems).filter(
    (n): n is number => typeof n === "number",
  );
  return set.length ? Math.max(...set) : undefined;
}

/** Keep only the band keys a caterer actually sells, dropping data left behind
 *  by a band they've since stopped selling. Without this, an old "Platinum: 6"
 *  reactivates unseen the day their bands change. Returns undefined when nothing
 *  survives, so the key stays off the record entirely. */
export function pruneTierMap<T>(
  map: Partial<Record<VendorTier, T>> | undefined,
  bands: readonly VendorTier[],
): Partial<Record<VendorTier, T>> | undefined {
  if (!map) return undefined;
  const kept = Object.fromEntries(
    TIER_ORDER.filter((t) => bands.includes(t) && map[t] !== undefined).map(
      (t) => [t, map[t] as T],
    ),
  ) as Partial<Record<VendorTier, T>>;
  return Object.keys(kept).length ? kept : undefined;
}

/** A dish's band list narrowed to the bands the caterer sells. Kept only while
 *  it's a real restriction — a list covering every band they sell is dropped, so
 *  "served everywhere" stays implicit and survives a later band change. */
export function pruneDishTiers(
  tiers: readonly VendorTier[] | undefined,
  bands: readonly VendorTier[],
): VendorTier[] | undefined {
  if (!tiers?.length) return undefined;
  const kept = TIER_ORDER.filter((t) => bands.includes(t) && tiers.includes(t));
  // Nothing left (or everything kept) both mean "no restriction worth storing":
  // an empty list would hide the dish from every band, which no vendor asks for.
  return kept.length && kept.length < bands.length ? kept : undefined;
}
