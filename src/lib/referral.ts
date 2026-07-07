/**
 * Referral attribution helpers for Bhojpatra partners.
 *
 * Event Planners and Individual Referrers each get a unique referral code at
 * signup. They share a `/book?ref=CODE` link (or hand the code over directly);
 * the booking wizard tags the confirmed feast with that code so it shows up in
 * the partner's dashboard, the admin console and the customer's My Bookings.
 *
 * There's no payout engine — earnings are settled by connecting with the
 * Bhojpatra team over WhatsApp (`referralPayoutHref`).
 */

import type { PartnerRole, PartnerMembership } from "@/lib/session";

/** Bhojpatra partner WhatsApp line — same number used on the partner landing. */
export const WHATSAPP_NUMBER = "919918359017";

/** Human label for each referral-partner type. */
export const PARTNER_ROLE_LABEL: Record<PartnerRole, string> = {
  planner: "Event Planner",
  individual: "Individual Referrer",
  venue: "Venue Owner",
};

/**
 * Partner roles that do person-to-person referral and therefore must not credit
 * their own booking. A Venue Owner earns when someone books their venue (a
 * place, not a person), so self-referral prevention deliberately targets only
 * the Individual Referrer and Event Planner roles.
 */
export const SELF_REFERRAL_ROLES: PartnerRole[] = ["individual", "planner"];

/**
 * True when `code` is one of this account's OWN referral codes for a role that
 * can't self-refer — i.e. applying it would credit the booker for their own
 * booking. Case- and whitespace-insensitive. A customer (no memberships), an
 * unrelated code, or a Venue Owner code all read as "not a self-referral".
 */
export function isSelfReferral(
  code: string,
  memberships: PartnerMembership[] | undefined,
): boolean {
  const norm = code.trim().toUpperCase();
  if (!norm || !memberships?.length) return false;
  return memberships.some(
    (m) =>
      SELF_REFERRAL_ROLES.includes(m.type) &&
      m.referralCode.trim().toUpperCase() === norm,
  );
}

/**
 * Normalise a phone to its last 10 digits (Indian mobile) so numbers entered
 * with a `+91`, spaces or dashes still compare equal. Returns "" when there
 * aren't 10 digits — an empty result never matches another empty result.
 */
export function normalizePhone(phone: string | undefined | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

/**
 * Cross-account self-referral: `isSelfReferral` only sees the codes on the
 * account that's currently signed in, so it can't catch a person who refers
 * themselves from a *second* account. This closes that gap by matching the
 * booking's phone against the registered phone of the partner who owns the
 * code. `referrer` is the partner record resolved from the code (its role +
 * phone); pass null/undefined for an unknown code. Only the person-to-person
 * roles are guarded (a Venue Owner earns on a place, not themselves), and both
 * phones must normalise to a full 10-digit number to count as a match.
 */
export function isPhoneSelfReferral(
  bookingPhone: string | undefined | null,
  referrer: { type: PartnerRole; phone?: string } | null | undefined,
): boolean {
  if (!referrer || !SELF_REFERRAL_ROLES.includes(referrer.type)) return false;
  const booker = normalizePhone(bookingPhone);
  return booker !== "" && booker === normalizePhone(referrer.phone);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no easily-confused chars

/**
 * Build a referral code seeded from the partner's name plus a short random
 * suffix, e.g. "REF-AB12CD". Uppercased and stripped of ambiguous characters
 * so it's easy to read aloud or type.
 */
export function makeReferralCode(name?: string): string {
  const seed = (name ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .padEnd(2, "X");
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `REF-${seed}${rand}`;
}

/**
 * Shareable booking link carrying a referral code. Absolute when an origin is
 * available (client), otherwise a relative path (server/SSR-safe).
 */
export function referralLink(code: string): string {
  const path = `/book?ref=${encodeURIComponent(code)}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

/**
 * WhatsApp link to settle referral earnings with the Bhojpatra team, prefilled
 * with the partner's code (and name when known).
 */
export function referralPayoutHref(code: string, name?: string): string {
  const who = name ? ` This is ${name}.` : "";
  const text = `Hi Bhojpatra! I'd like to settle my referral earnings.${who} My referral code is ${code}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
