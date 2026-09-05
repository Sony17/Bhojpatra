/** Veg / non-veg guest split — the "Craft My Plate" brief.
 *
 * A guest declares not just how many people are coming but how many of them eat
 * veg vs non-veg. That split then drives every diet decision downstream: the
 * menu steps hide dishes the plate can't serve, and vendor rosters drop stalls
 * that would have nothing to offer.
 *
 * STATE MODEL — the split is DERIVED, never stored (see `resolveNonVeg`).
 * Callers keep the existing `foodPreference` label (authoritative, already on
 * every order and invoice) plus a `mix` — the exact non-veg count dialled in
 * for a "Both" event — and read the split from the two. Nothing to keep in
 * sync, so the label and the counts cannot drift apart, and a changed
 * head-count re-derives for free.
 *
 * The filter rules are deliberately strict and live only here, so both
 * wizards, the extras step and the checkout all agree:
 *
 *   • Split unset (`nonVeg === null`) — the guest hasn't declared anything, so
 *     nothing is filtered. Fully backwards compatible with old drafts/orders.
 *   • A NON-VEG dish is allowed only when the plate has non-veg eaters
 *     (`nonVeg > 0`). A pure-veg event can never even see a non-veg dish.
 *   • A VEG dish is always allowed — non-veg eaters share the veg spread
 *     (breads, drinks, desserts are largely veg; hiding them would make an
 *     all-non-veg order impossible to assemble).
 *   • A vendor/stall stays on a roster only while it has at least one allowed
 *     dish left. An all-non-veg kebab stall vanishes from a pure-veg event.
 *     (Enforced by the callers, which drop a stall once `dishAllowed` has
 *     emptied its dish list — see the wizards' course gates.)
 *   • A meat-only kitchen never serves a pure-veg plate (`kitchenFitsSplit`).
 *     The reverse stays open: a veg kitchen can run a counter at a mixed
 *     event — only its dishes are gated.
 *
 * Kept client-safe (no store, no crypto) — both wizards, the catalog and the
 * booking API route import from here.
 */
import type { DietType } from "@/lib/data";

/** Canonical `foodPreference` labels already stored on orders / invoices —
 *  mirror `bookingFoodPreferences` in `data.ts`. */
export const PREF_PURE_VEG = "Pure Veg";
export const PREF_NON_VEG = "Non-veg";
export const PREF_BOTH = "Both";

/** The declared split. `nonVeg === null` means "not declared yet" — every
 *  filter below treats that as allow-everything. `veg` is always derived as
 *  `guests - nonVeg`, never stored separately, so the two can't drift. */
export type NonVegCount = number | null;

/** Clamp a declared non-veg count into the current head-count. Keeps the
 *  split valid when the guest later shrinks the party. */
export function clampNonVeg(nonVeg: NonVegCount, guests: number): NonVegCount {
  if (nonVeg === null) return null;
  return Math.max(0, Math.min(guests, Math.round(nonVeg)));
}

/** Veg head-count for a declared split (0 when the split is unset — callers
 *  should gate on `nonVeg !== null` before showing counts). */
export function vegCount(nonVeg: NonVegCount, guests: number): number {
  const nv = clampNonVeg(nonVeg, guests);
  return nv === null ? 0 : guests - nv;
}

/** The `foodPreference` label a split derives to — "" while unset, else the
 *  exact strings the order/invoice/admin pipeline already stores. */
export function foodPreferenceForSplit(
  nonVeg: NonVegCount,
  guests: number,
): string {
  const nv = clampNonVeg(nonVeg, guests);
  if (nv === null) return "";
  if (nv <= 0) return PREF_PURE_VEG;
  if (nv >= guests) return PREF_NON_VEG;
  return PREF_BOTH;
}

/** THE split, derived — never stored, so it can never drift from the
 *  preference or go stale against a changed head-count.
 *
 *  `foodPreference` is authoritative (it is what already rides onto orders and
 *  invoices); `mix` is only the exact non-veg count a guest dialled in for a
 *  "Both" event, and is ignored on the two extremes. Because this is a pure
 *  read, changing `guests` re-derives everything for free: an all-non-veg
 *  event stays all-non-veg at any head-count, and a mixed one re-clamps.
 *
 *  Callers hold `[foodPreference, mix]` in state and derive the split from
 *  them — never the reverse. */
export function resolveNonVeg(
  pref: string,
  mix: NonVegCount,
  guests: number,
): NonVegCount {
  if (pref === PREF_PURE_VEG) return 0;
  if (pref === PREF_NON_VEG) return guests;
  if (pref === PREF_BOTH) {
    const dialled = clampNonVeg(mix, guests);
    // A mix that survives as genuinely mixed wins; otherwise open at an even
    // half so the slider starts somewhere sensible.
    if (dialled !== null && dialled > 0 && dialled < guests) return dialled;
    return Math.max(1, Math.min(guests - 1, Math.round(guests / 2)));
  }
  return null;
}

/** STRICT dish gate: non-veg dishes need non-veg eaters on the plate; veg
 *  dishes (and unmarked items — services carry no diet) always pass. An unset
 *  split filters nothing. */
export function dishAllowed(
  diet: DietType | undefined,
  nonVeg: NonVegCount,
): boolean {
  if (nonVeg === null) return true;
  if (diet !== "non-veg") return true;
  return nonVeg > 0;
}

/** STRICT kitchen gate against a catalog listing's declared diet
 *  (`"Veg" | "Non-Veg" | "Veg & Non-Veg"`): a pure-veg plate never gets a
 *  meat-only kitchen. The other direction stays open — a veg kitchen can
 *  always run a counter (chaat, drinks, desserts) at a mixed event; only its
 *  dishes are gated, by `dishAllowed`. */
export function kitchenFitsSplit(diet: string, nonVeg: NonVegCount): boolean {
  if (nonVeg === null || nonVeg > 0) return true;
  return diet !== "Non-Veg";
}

/** True when every item on a fixed spread survives the dish gate — a fixed
 *  (non-customisable) stall whose set menu carries non-veg lines conflicts
 *  with a pure-veg plate and must be flagged, not silently trimmed. */
export function fixedSpreadFits(
  items: readonly { diet?: DietType }[],
  nonVeg: NonVegCount,
): boolean {
  return items.every((it) => dishAllowed(it.diet, nonVeg));
}

/** Short plate summary for receipts / checkout — "120 Veg · 80 Non-veg"
 *  (localised by the caller's `t`). Empty while the split is unset. */
export function splitSummary(
  nonVeg: NonVegCount,
  guests: number,
  t: (en: string, hi: string) => string = (en) => en,
): string {
  const nv = clampNonVeg(nonVeg, guests);
  if (nv === null) return "";
  const veg = guests - nv;
  const parts: string[] = [];
  if (veg > 0) parts.push(`${veg} ${t("Veg", "वेज")}`);
  if (nv > 0) parts.push(`${nv} ${t("Non-veg", "नॉन-वेज")}`);
  return parts.join(" · ");
}
