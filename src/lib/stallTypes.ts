import {
  addOns,
  listingCateringCategories,
  listingOfferings,
  type VendorListing,
} from "@/lib/data";

/**
 * STALL TYPES — the image tiles a guest picks from before browsing stalls.
 *
 * Deliberately the SAME vocabulary as the wizard's Extras step (`addOns`), not
 * a parallel list: a "stall type" is exactly one of the platform's live
 * counters, and a vendor declares which ones they run via `offerings`. One
 * source of truth means a counter can never exist as a browsable type but not
 * as something a vendor can claim.
 *
 * Services (staff, tableware, decor) are excluded — you cannot book a stall of
 * waiters, and decor isn't a food stall at all.
 */
export interface StallType {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  icon: string;
  image: string;
}

export const stallTypes: StallType[] = addOns
  .filter((a) => (a.category ?? "counter") === "counter")
  .map((a) => ({
    id: a.id,
    name: a.name,
    nameHi: a.nameHi,
    description: a.description,
    icon: a.icon,
    image: a.image,
  }));

const STALL_TYPE_IDS = new Set(stallTypes.map((s) => s.id));

/** Guards the `?counter=` deep-link so a stray value can't wedge the catalog. */
export function isStallTypeId(id: string): boolean {
  return STALL_TYPE_IDS.has(id);
}

export function stallTypeById(id: string): StallType | undefined {
  return stallTypes.find((s) => s.id === id);
}

/** City display names are what listings carry ("Lucknow"). An EXACT match, on
 *  purpose: the Brands catalog filters `v.city === city`, and the counts here
 *  must agree with what a tile's link then shows — a looser match would
 *  promise "3 stalls" and open an empty catalog. */
function inCity(v: VendorListing, city: string): boolean {
  return !city || v.city === city;
}

/** Single-stall listings running a given counter type, optionally in one city. */
export function stallsForType(
  vendors: VendorListing[],
  typeId: string,
  city = "",
): VendorListing[] {
  return vendors.filter(
    (v) =>
      inCity(v, city) &&
      listingCateringCategories(v).includes("single-stall") &&
      listingOfferings(v).includes(typeId),
  );
}

/**
 * How many bookable stalls each type has, for the city in hand. The picker
 * needs real counts rather than a yes/no: a type nobody runs here is shown
 * muted ("coming soon") instead of leading to an empty catalog.
 *
 * `bookable` says whether a catalog listing can actually be booked in the
 * wizard (it has a booking-menu record). A listing with no menu would be
 * counted on a tile, then greet the guest with "we couldn't find this stall".
 */
export function stallTypeCounts(
  vendors: VendorListing[],
  city = "",
  bookable: (v: VendorListing) => boolean = () => true,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of stallTypes) counts[s.id] = 0;
  for (const v of vendors) {
    if (!inCity(v, city)) continue;
    if (!listingCateringCategories(v).includes("single-stall")) continue;
    if (!bookable(v)) continue;
    for (const id of listingOfferings(v)) {
      if (id in counts) counts[id] += 1;
    }
  }
  return counts;
}
