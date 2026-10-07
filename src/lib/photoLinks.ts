/**
 * Dish / box photos are either the vendor's own upload (`/api/vendor/photo/<id>`)
 * or an image LINK they pasted (any https URL). Client-safe: the onboarding
 * modals, the menu route and every renderer share this one rule.
 */

const MAX_LINK_LENGTH = 600;

/** Stock card photo used when a vendor hasn't set a cover (same curated
 *  Unsplash set as data.ts). Never shown back to the vendor as "their" photo. */
export const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=70";

export function isStockVendorImage(src: string | undefined | null): boolean {
  return src === DEFAULT_VENDOR_IMAGE;
}

/** True for a pasted https image link (no credentials, sane length). */
export function isLinkedPhotoUrl(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > MAX_LINK_LENGTH) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * `next/image` only optimizes allow-listed hosts and throws on anything else,
 * so a pasted link renders unoptimized (the browser loads it directly).
 */
export function photoNeedsUnoptimized(src: string | undefined | null): boolean {
  return isLinkedPhotoUrl(src) && !/^https:\/\/(images|plus)\.unsplash\.com\//.test(src);
}
