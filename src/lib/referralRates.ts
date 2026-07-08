/**
 * Admin-configurable referral rates.
 *
 * Referral codes used to do attribution only (tag a booking to a partner). This
 * adds two admin-set percentages per person-to-person partner type:
 *
 *  • `customerPercent` — a discount the CUSTOMER gets off their pre-tax bill
 *    when they book with the code (applied live in the booking wizard).
 *  • `referrerPercent` — the reward the REFERRER earns on confirmed referred
 *    value (shown on the partner dashboard and the admin referrals console;
 *    still settled manually over WhatsApp — this only computes the number).
 *
 * Venue Owners are deliberately excluded: they earn on a booked place through a
 * different flow, not person-to-person referral (see `SELF_REFERRAL_ROLES` in
 * `@/lib/referral`). Everything defaults to 0 so, until an admin configures a
 * rate, behaviour is unchanged (codes attribute, but grant no discount/reward).
 *
 * Framework-free so it runs on the client (the wizard, both dashboards) and the
 * server (the settings route's validation).
 */

/** A partner type's two configurable referral percentages. */
export interface ReferralRatePair {
  /** % off the customer's pre-tax bill when they book with this type's code. */
  customerPercent: number;
  /** % of confirmed referred value the referrer earns as a reward. */
  referrerPercent: number;
}

/** The person-to-person partner types these rates apply to. */
export const REFERRAL_RATE_ROLES = ["individual", "planner"] as const;
export type ReferralRateRole = (typeof REFERRAL_RATE_ROLES)[number];

/** Admin-configured referral rates, keyed by person-to-person partner type. */
export type ReferralRates = Record<ReferralRateRole, ReferralRatePair>;

/** Upper bound for any single percentage — guards a fat-finger (e.g. 500%). */
export const MAX_REFERRAL_PERCENT = 50;

/** Everything off until an admin sets a rate — preserves today's behaviour. */
export const DEFAULT_REFERRAL_RATES: ReferralRates = {
  individual: { customerPercent: 0, referrerPercent: 0 },
  planner: { customerPercent: 0, referrerPercent: 0 },
};

/**
 * Clamp one percentage to a whole number in [0, MAX_REFERRAL_PERCENT].
 * Non-finite, negative or missing input reads as 0.
 */
export function clampPercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n), MAX_REFERRAL_PERCENT);
}

/**
 * Merge a stored/partial blob onto the defaults, clamping every percentage, so
 * callers always get a complete, in-range `ReferralRates`.
 */
export function normalizeReferralRates(raw: unknown): ReferralRates {
  const src = (raw ?? {}) as Partial<
    Record<ReferralRateRole, Partial<ReferralRatePair>>
  >;
  const pair = (role: ReferralRateRole): ReferralRatePair => ({
    customerPercent: clampPercent(src[role]?.customerPercent),
    referrerPercent: clampPercent(src[role]?.referrerPercent),
  });
  return { individual: pair("individual"), planner: pair("planner") };
}

/** True for the person-to-person roles that carry referral rates. */
export function isReferralRateRole(
  type: string | undefined | null,
): type is ReferralRateRole {
  return type === "individual" || type === "planner";
}

/**
 * Customer discount % for a booking referred by this partner type. Non-rate
 * roles (venue, unknown, missing) always resolve to 0.
 */
export function customerPercentFor(
  rates: ReferralRates,
  type: string | undefined | null,
): number {
  return isReferralRateRole(type) ? rates[type].customerPercent : 0;
}

/**
 * Referrer reward % this partner type earns. Non-rate roles resolve to 0.
 */
export function referrerPercentFor(
  rates: ReferralRates,
  type: string | undefined | null,
): number {
  return isReferralRateRole(type) ? rates[type].referrerPercent : 0;
}
