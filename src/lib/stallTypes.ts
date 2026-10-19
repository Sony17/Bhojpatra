import {
  listingCateringCategories,
  menuCategories,
  listingOfferings,
  type VendorListing,
} from "@/lib/data";

/**
 * STALL TYPES — the image tiles a guest picks from before browsing stalls
 * (Single Stall only), and the `?counter=` value the catalog lens and the stall
 * wizard narrow on.
 *
 * One stall type = one stall category a vendor builds in their Single Stall
 * builder (`PLATFORM_STALL_CATEGORIES`), identified by the booking-menu course
 * it publishes into (`menuId`). So a tile, a vendor's stall and a menu course
 * are the same thing: picking "South Indian" shows exactly that stall's menu,
 * never the vendor's other stalls folded under a broader label.
 *
 * Deliberately NOT the Extras step's add-on counters (`addOns`): those are paid
 * extras for any booking (Pan, Pizza, Momo…), sold platform-wide. Old links and
 * drafts that still carry an add-on counter id are translated by
 * `toStallTypeId` (`mocktail` → Juices, `dessert` → Desserts…).
 */
export interface StallType {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  icon: string;
  image: string;
}

/** City display names are what listings carry ("Lucknow"). An EXACT match, on
 *  purpose: the Brands catalog filters `v.city === city`, and the counts here
 *  must agree with what a tile's link then shows — a looser match would
 *  promise "3 stalls" and open an empty catalog. */
function inCity(v: VendorListing, city: string): boolean {
  return !city || v.city === city;
}

/** A listing's declared counters, read as stall types (for listings with no
 *  booking menu to go on). */
function offeredStallTypes(v: VendorListing): string[] {
  return [...new Set(listingOfferings(v).map(toStallTypeId).filter(Boolean))];
}

/** Single-stall listings running a given stall type, optionally in one city. */
export function stallsForType(
  vendors: VendorListing[],
  typeId: string,
  city = "",
): VendorListing[] {
  return vendors.filter(
    (v) =>
      inCity(v, city) &&
      listingCateringCategories(v).includes("single-stall") &&
      offeredStallTypes(v).includes(typeId),
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
  menuTypes: (v: VendorListing) => string[] | null = offeredStallTypes,
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

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

/** Tile photo per stall type (course id). */
const STALL_TYPE_IMAGE: Record<string, string> = {
  chaat: unsplash("photo-1601050690597-df0568f70950"),
  juices: unsplash("photo-1544145945-f90425340c7e"),
  beverages: unsplash("photo-1437418747212-8d9709afab22"),
  "south-indian": unsplash("photo-1630383249896-424e482df921"),
  "north-indian": unsplash("photo-1585937421612-70a008356fbe"),
  chinese: unsplash("photo-1585032226651-759b368d7246"),
  snacks: unsplash("photo-1565895405227-31cffbe0cf86"),
  desserts: unsplash("photo-1631452180519-c014fe946bc7"),
  "ice-cream": unsplash("photo-1578985545062-69928b1d9587"),
  "street-food": unsplash("photo-1490645935967-10de6ba17061"),
  live: unsplash("photo-1567188040759-fb8a883dc6d8"),
  breakfast: unsplash("photo-1556910103-1c02745aae4d"),
  regional: unsplash("photo-1555939594-58d7cb561ad1"),
  pizza: unsplash("photo-1513104890138-7c749659a591"),
  pasta: unsplash("photo-1473093295043-cdd812d0e601"),
};

/** Older stall categories a vendor may still have a menu under. */
const LEGACY_STALL_TYPES: Omit<StallType, "nameHi" | "image">[] = [
  { id: "pizza", name: "Wood-Fired Pizza", description: "Pizzas tossed & baked live", icon: "🍕" },
  { id: "pasta", name: "Live Pasta", description: "Pasta tossed to order", icon: "🍝" },
];

export const stallTypes: StallType[] = [
  ...PLATFORM_STALL_CATEGORIES.map((c) => ({
    id: c.menuId ?? c.id,
    name: c.name,
    description: c.desc,
    icon: c.icon,
  })),
  ...LEGACY_STALL_TYPES,
].map((s) => ({
  ...s,
  // The course's own Hindi name — the stall builder list is English-only.
  nameHi: menuCategories.find((c) => c.id === s.id)?.nameHi ?? s.name,
  image: STALL_TYPE_IMAGE[s.id] ?? STALL_TYPE_IMAGE.regional,
}));

const STALL_TYPE_IDS = new Set(stallTypes.map((s) => s.id));

/** Whether a value is a current stall type id (a stall course). */
export function isStallTypeId(id: string): boolean {
  return STALL_TYPE_IDS.has(id);
}

/** Add-on counter ids old links / drafts / declared offerings still carry →
 *  the stall type that now stands for them. Pan, Momo and Waffle have no stall
 *  category, so they map to nothing. */
const LEGACY_COUNTER_TYPE: Record<string, string> = {
  mocktail: "juices",
  coffee: "beverages",
  noodle: "chinese",
  dessert: "desserts",
  "hi-tea": "snacks",
};

/** Normalise a `?counter=` / draft / offering value to a stall type id, or ""
 *  when it names nothing bookable — so a stray value can't wedge the catalog. */
export function toStallTypeId(raw: string): string {
  if (STALL_TYPE_IDS.has(raw)) return raw;
  const mapped = LEGACY_COUNTER_TYPE[raw];
  return mapped && STALL_TYPE_IDS.has(mapped) ? mapped : "";
}

export function stallTypeById(id: string): StallType | undefined {
  return stallTypes.find((s) => s.id === id);
}
