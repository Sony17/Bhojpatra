/**
 * Admin-curated "Top 5" for the /book menu-builder vendor ribbon (server-safe
 * types + helpers, shared by the API route, the menu assembly and the admin UI).
 *
 * The wizard's vendor roster otherwise follows stored order (curated seeds
 * first, then live vendors as they publish). Admins pin up to
 * `TOP_FIVE_COUNT` brands from Vendor Management ("Push to Top 5") and those
 * lead every category roster they appear in, newest push first. Pins are
 * stored in the `settings` singleton under `TOP_VENDORS_KEY`.
 */
import { slugifyName } from "@/lib/bookings";

export const TOP_FIVE_COUNT = 5;
export const TOP_VENDORS_KEY = "top-vendors";

/** One pinned brand. `id` matches live vendor records exactly; `name` bridges
 *  by slug to surfaces that don't share ids (seed specialists, catalog). */
export interface TopVendorPin {
  id: string;
  name: string;
}

export interface TopVendors {
  pins: TopVendorPin[];
}

export const DEFAULT_TOP_VENDORS: TopVendors = { pins: [] };

/** Sanitize a stored pin list: well-formed entries only, capped at five. */
export function reconcileTopVendors(
  stored: Partial<TopVendors> | null | undefined,
): TopVendors {
  const pins = Array.isArray(stored?.pins)
    ? stored.pins
        .filter(
          (p): p is TopVendorPin =>
            !!p &&
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            p.name.trim() !== "",
        )
        .slice(0, TOP_FIVE_COUNT)
        .map((p) => ({ id: p.id, name: p.name }))
    : [];
  return { pins };
}

/** The vendor's slot in the Top 5 (0-based), or -1 when not pinned. Matches
 *  by id first, then by name slug — the same bridge reviews use. */
export function pinRank(
  pins: TopVendorPin[],
  vendor: { id: string; name: string },
): number {
  const slug = slugifyName(vendor.name);
  return pins.findIndex(
    (p) => p.id === vendor.id || slugifyName(p.name) === slug,
  );
}
