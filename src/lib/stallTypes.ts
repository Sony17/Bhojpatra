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
 * `menuTypes` gives the stall types a catalog listing actually has a booking
 * menu for, or null when it can't be booked in the wizard at all. A listing is
 * counted only under types it has a menu for — a declared counter with no
 * menu ("Pan Counter" ticked as an add-on) would otherwise lead to a stall
 * with nothing to sell. Without it, declared offerings are counted.
 */
export function stallTypeCounts(
  vendors: VendorListing[],
  city = "",
  menuTypes: (v: VendorListing) => string[] | null = listingOfferings,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of stallTypes) counts[s.id] = 0;
  for (const v of vendors) {
    if (!inCity(v, city)) continue;
    if (!listingCateringCategories(v).includes("single-stall")) continue;
    const types = menuTypes(v);
    if (!types) continue;
    for (const id of types) {
      if (id in counts) counts[id] += 1;
    }
  }
  return counts;
}

/** Stall-builder category → the platform stall type (`addOns` counter id)
 *  the /book/stall tiles and the catalog's counter filter use. Custom
 *  categories and anything unmapped read as a generic live station when a
 *  vendor's stall list is projected (`stallTypeIdsFor`). The keys are also the
 *  booking-menu course ids those stalls publish under. */
const STALL_CATEGORY_TYPE: Record<string, string> = {
  chaat: "chaat",
  "street-food": "chaat",
  juices: "mocktail",
  mocktail: "mocktail",
  beverages: "coffee",
  coffee: "coffee",
  "south-indian": "live",
  "north-indian": "live",
  "live-grills": "live",
  live: "live",
  breakfast: "live",
  regional: "live",
  pasta: "live",
  chinese: "noodle",
  snacks: "hi-tea",
  "hi-tea": "hi-tea",
  desserts: "dessert",
  "ice-cream": "dessert",
  dessert: "dessert",
  pizza: "pizza",
  momo: "momo",
  waffle: "waffle",
  pan: "pan",
};

/** The stall type a stall-builder category / booking course belongs to, or
 *  undefined for a feast course (welcome, starters, main…) that isn't a stall. */
export function stallTypeOfCategory(categoryId: string): string | undefined {
  return STALL_CATEGORY_TYPE[categoryId];
}

/** Handover: PREDEFINED_STALL_CATEGORIES. `menuId` = the platform menu category the
 *  stall's dishes are mirrored into for the customer stall-booking flow. */
export const PLATFORM_STALL_CATEGORIES: { id: string; name: string; icon: string; desc: string; menuId?: string }[] = [
  { id: "chaat", name: "Chaat", icon: "🥘", desc: "Live pani puri, aloo tikki, dahi bhalla & papdi", menuId: "chaat" },
  { id: "juices", name: "Juices & Shakes", icon: "🥤", desc: "Freshly squeezed fruit juices, shakes & coolers", menuId: "juices" },
  { id: "beverages", name: "Beverages & Chai", icon: "☕", desc: "Kulhad chai, filter coffee, artisan mocktails", menuId: "beverages" },
  { id: "south-indian", name: "South Indian", icon: "🥥", desc: "Crispy dosas, idlis, vadas with sambar & chutneys", menuId: "south-indian" },
  { id: "north-indian", name: "North Indian & Mughlai", icon: "🍛", desc: "Curries, rolls, kebabs, tandoor specials & naans", menuId: "north-indian" },
  { id: "chinese", name: "Chinese & Pan-Asian", icon: "🍜", desc: "Hakka noodles, dim sums, momos & Manchurian", menuId: "chinese" },
  { id: "snacks", name: "Snacks & Fast Food", icon: "🥪", desc: "Sandwiches, burgers, fries, kathi rolls", menuId: "snacks" },
  { id: "desserts", name: "Desserts & Sweets", icon: "🍬", desc: "Hot jalebi, gulab jamun, rabri, kulfi", menuId: "desserts" },
  { id: "ice-cream", name: "Ice Cream & Kulfi", icon: "🍨", desc: "Artisanal rolled scoops, matka kulfi & sundaes", menuId: "ice-cream" },
  { id: "street-food", name: "Street Food Specials", icon: "🍢", desc: "Pav bhaji, chole bhature, dabeli, momos", menuId: "street-food" },
  { id: "live-grills", name: "Live Grills & Barbecue", icon: "🔥", desc: "Smoked paneer skewers, tikkas & charcoal kebabs", menuId: "live" },
  { id: "breakfast", name: "Breakfast Counter", icon: "🥞", desc: "Poori sabzi, parathas, poha, upma & chole kulche", menuId: "breakfast" },
  { id: "regional", name: "Regional / Specialty", icon: "🏺", desc: "Awadhi, Rajasthani, Gujarati or hyperlocal specials", menuId: "regional" },
];

/** Older stall ids that publish under their own menu course. */
const LEGACY_MENU_IDS = new Set(["live", "pizza", "pasta"]);

/** The platform menu category a stall's dishes publish into, so customers can
 *  book it. A vendor's own custom category (and any older id without a match)
 *  publishes under "Regional Specialties" rather than staying invisible. */
export function stallMenuId(id: string) {
  return PLATFORM_STALL_CATEGORIES.find((c) => c.id === id)?.menuId ?? (LEGACY_MENU_IDS.has(id) ? id : "regional");
}
