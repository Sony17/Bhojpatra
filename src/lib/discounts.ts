/**
 * Automatic, rule-based discount engine.
 *
 * Coupons (see `coupons` in `data.ts`) are codes the customer types in. These
 * rules fire *automatically* from the shape of the order — guest volume,
 * how far ahead they book, and the occasion — with no code required. They
 * stack on top of any coupon (each is shown as its own line) and the wizard
 * caps the combined discount so the taxable amount never goes negative.
 *
 * Pure + framework-free so it can run on the client (live in the wizard) and,
 * if ever needed, on the server (e.g. to re-validate a posted booking).
 */

export interface DiscountContext {
  guests: number;
  occasionId: string;
  packageId: string;
  /** Whole days from today until the event, or null when no date is chosen. */
  daysUntilEvent: number | null;
  /** Amount the percentage applies to (subtotal + add-ons, pre-tax). */
  base: number;
}

export interface AutoDiscount {
  id: string;
  label: string;
  labelHi: string;
  /** Headline percentage (for display). */
  percent: number;
  /** Resolved, capped discount amount in ₹. */
  amount: number;
}

interface Rule {
  id: string;
  label: string;
  labelHi: string;
  percent: number;
  /** Max ₹ this single rule can take off. */
  cap: number;
  applies: (ctx: DiscountContext) => boolean;
}

/** Occasions treated as "wedding-scale" events for the seasonal offer. */
const WEDDING_OCCASIONS = new Set(["wedding", "reception", "engagement"]);

/**
 * Rules are evaluated independently and every match applies. The volume tiers
 * and early-bird tiers are written to be mutually exclusive within their group
 * (by guest count / days-ahead band) so a customer only ever gets one of each.
 */
const RULES: Rule[] = [
  // ── Volume tiers (one applies, by guest count) ──────────────────────
  {
    id: "bulk-1000",
    label: "Grand feast discount · 1,000+ guests",
    labelHi: "भव्य भोज छूट · 1,000+ मेहमान",
    percent: 8,
    cap: 40000,
    applies: (c) => c.guests >= 1000,
  },
  {
    id: "bulk-500",
    label: "Bulk guest discount · 500+ guests",
    labelHi: "बल्क मेहमान छूट · 500+ मेहमान",
    percent: 5,
    cap: 20000,
    applies: (c) => c.guests >= 500 && c.guests < 1000,
  },
  {
    id: "bulk-250",
    label: "Group discount · 250+ guests",
    labelHi: "ग्रुप छूट · 250+ मेहमान",
    percent: 3,
    cap: 10000,
    applies: (c) => c.guests >= 250 && c.guests < 500,
  },
  // ── Early-bird tiers (one applies, by days ahead) ───────────────────
  {
    id: "early-60",
    label: "Early-bird · booked 60+ days ahead",
    labelHi: "अर्ली-बर्ड · 60+ दिन पहले बुकिंग",
    percent: 5,
    cap: 15000,
    applies: (c) => c.daysUntilEvent != null && c.daysUntilEvent >= 60,
  },
  {
    id: "early-30",
    label: "Advance booking · 30+ days ahead",
    labelHi: "एडवांस बुकिंग · 30+ दिन पहले",
    percent: 2,
    cap: 6000,
    applies: (c) =>
      c.daysUntilEvent != null &&
      c.daysUntilEvent >= 30 &&
      c.daysUntilEvent < 60,
  },
  // ── Occasion ────────────────────────────────────────────────────────
  {
    id: "wedding",
    label: "Wedding & reception offer",
    labelHi: "वेडिंग व रिसेप्शन ऑफर",
    percent: 4,
    cap: 20000,
    applies: (c) => WEDDING_OCCASIONS.has(c.occasionId),
  },
];

/**
 * Evaluate all automatic rules for an order and return the discounts that
 * apply (already resolved to ₹ amounts and capped per-rule). Zero-value
 * matches are dropped.
 */
export function computeAutoDiscounts(ctx: DiscountContext): AutoDiscount[] {
  if (ctx.base <= 0) return [];
  return RULES.filter((r) => r.applies(ctx))
    .map((r) => ({
      id: r.id,
      label: r.label,
      labelHi: r.labelHi,
      percent: r.percent,
      amount: Math.min((ctx.base * r.percent) / 100, r.cap),
    }))
    .filter((d) => d.amount > 0);
}
