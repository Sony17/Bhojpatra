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

/** The Bhojpatra logo on brand red: what a missing photo shows. Single Stall
 *  keeps its three image kinds apart — stall-type tiles (admin), stall covers
 *  (the brand's own) and dishes (the vendor's own) — so a missing one shows
 *  the logo, never a photo borrowed from another kind. */
const NO_PHOTO_PLACEHOLDER = "/placeholders/no-photo.svg";
export const DISH_PLACEHOLDER = NO_PHOTO_PLACEHOLDER;
export const STALL_PLACEHOLDER = NO_PHOTO_PLACEHOLDER;

/**
 * A stall's cover photo: the brand's own upload or pasted link. Stock Unsplash
 * art (the seed set, which the tile defaults share) and any photo the admin
 * uses on a stall-type tile read as "no cover", so a stall never wears the
 * same picture as a tile.
 */
export function stallCoverPhoto(
  src: string | undefined | null,
  tileImages?: Record<string, string>,
): string {
  if (!src || /^https:\/\/(images|plus)\.unsplash\.com\//.test(src)) {
    return STALL_PLACEHOLDER;
  }
  if (tileImages && Object.values(tileImages).includes(src)) return STALL_PLACEHOLDER;
  return src;
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
