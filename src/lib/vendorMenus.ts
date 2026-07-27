/**
 * Live vendor profiles + menus — the store behind the customer-facing menu
 * builder and vendor catalog.
 *
 * Two kinds of record live here:
 *   • Platform seeds — the curated specialist vendors that used to be the
 *     hardcoded `menuCategories` fixtures in `data.ts`. Written once on first
 *     read so the marketplace never looks empty.
 *   • Live vendors — records owned by a signed-in vendor account
 *     (`ownerUserId` set), created and edited from the "My Menu" tab of the
 *     vendor dashboard. These surface to customers in the /book wizard and,
 *     once they publish at least one dish, in the /vendors catalog.
 *
 * The /book wizard consumes the assembled `MenuCategory[]` shape produced by
 * `assembleMenuCategories()`, which is byte-compatible with the old fixture:
 * item ids are minted as `${vendorId}-${index}` because the wizard relies on
 * that prefix to drop a de-selected vendor's items (multi-vendor tiers).
 */
import { randomUUID } from "crypto";
import { createStore, readSingleton } from "@/lib/store";
import {
  TOP_VENDORS_KEY,
  pinRank,
  reconcileTopVendors,
  type TopVendors,
} from "@/lib/topVendorsData";
import {
  cateringCategories,
  cateringCategoryIds,
  menuCategories,
  vendorListings,
  vendorOfferings,
  vendorOfferingIds,
  type DietType,
  type MenuCategory,
  type VendorListing,
} from "@/lib/data";
import { parseTiers, sortTiers, type VendorTier } from "@/lib/admin/types";

export interface VendorMenuItem {
  name: string;
  diet: DietType;
  /** Same-origin dish photo URL (`/api/vendor/photo/<id>`), owned by the vendor. */
  photo?: string;
  /** Per-delicacy price (₹) a Single Stall vendor may set for this dish.
   *  Optional: when absent, the dish falls back to its course per-plate rate.
   *  Only surfaced in the Single Stall flow. */
  price?: number;
}

/** Content moderation for live vendors — a pre-approval model: new/edited menus
 *  land as "Pending" and stay OFF every customer surface (catalog, /book wizard,
 *  public detail page) until an admin marks them "Approved". A fresh save flips
 *  Approved back to Pending for re-review; "Hidden" is an admin takedown that
 *  stays Hidden until restored. Platform seeds are born Approved. */
export type ModerationStatus = "Pending" | "Approved" | "Hidden";

/** One course/category a vendor serves, with their per-plate uplift. */
export interface VendorMenuSection {
  /** One of the platform category ids (`menuCategories[].id`). */
  categoryId: string;
  /** Per-plate amount added on top of the package base (₹). */
  perPlate: number;
  items: VendorMenuItem[];
  /** Paused by the vendor: dishes stay saved but customers don't see them. */
  hidden?: boolean;
}

/** One Baina Box the vendor sells — the sweet/gifting boxes customers browse
 *  from the home "Baina Box" section. The vendor's own box menu. */
/** A vendor-defined extra box size (e.g. 250 g, 2 kg) with its own price. */
export interface VendorBoxSize {
  /** Size label shown to customers (e.g. "250 g", "2 kg"). */
  label: string;
  /** Price for this size (₹). */
  price: number;
}

export interface VendorBainaBox {
  name: string;
  /** What's inside, comma separated (shown on the box card). */
  contents: string;
  /** Price per ½ kg box (₹) — the base booking size. */
  price: number;
  /** Price per 1 kg box (₹), when the vendor also offers the bigger size. */
  price1kg?: number;
  /** Extra vendor-defined sizes beyond ½ kg / 1 kg (e.g. 250 g, 2 kg). */
  customSizes?: VendorBoxSize[];
  /** Box photo (same-origin `/api/vendor/photo/<id>` URL, vendor-owned). */
  photo?: string;
}

/** The vendor's Essential Service offer — the service-only tier customers see
 *  on /service-packages (crew, buffet setup & essentials), at the vendor's
 *  own per-guest rate with what they include. */
export interface VendorEssentialService {
  /** Per-guest rate (₹). 0 is valid — the platform tier starts at ₹0. */
  perGuest: number;
  /** What the vendor includes (checklist + their own additions). */
  includes: string[];
}

/** A live counter / service the vendor declares they run — one of the platform
 *  add-ons the /book wizard sells (`vendorOfferings` / `addOns`). Lets a vendor
 *  advertise the same extras customers browse (pan, live woks, dessert counters,
 *  service staff, decor…), each at their own rate. */
export interface VendorCounter {
  /** One of the platform offering ids (`vendorOfferingIds`). */
  id: string;
  /** Vendor's own price (₹); falls back to the platform default when absent. */
  price?: number;
}

export interface LiveVendorRecord {
  id: string;
  /** Auth user (role "vendor") who owns this profile. Absent on platform seeds. */
  ownerUserId?: string;
  /** Owner's login email — used to link the approved application (verified badge). */
  ownerEmail?: string;
  business: string;
  city: string;
  state: string;
  cuisines: string[];
  about?: string;
  /** Base per-plate rate shown on the catalog card (₹). */
  priceFrom: number;
  /** Max guests the caterer can serve at a single event. */
  maxCapacity?: number;
  /** Max events the caterer can cater in a single day. */
  maxEventsPerDay?: number;
  image: string;
  /** Seed display rating; live vendors start at 0 = "New" until real reviews land. */
  rating: number;
  reviews: number;
  /** Vendor-declared Google rating (0–5) + review count, imported at
   *  registration. Shown as a distinct "Google" badge on the card, so a new
   *  vendor isn't a blank "New" while their real Bhojpatra reviews accrue. */
  googleRating?: number;
  googleReviews?: number;
  verified: boolean;
  /** Marketplace tier bands the vendor serves — self-selected from the
   *  dashboard, falling back to the admin's review decision on the linked
   *  application. Drives the catalog card and the /book wizard's tier lenses
   *  (including Single Stall). Overrides the price-derived default when set. */
  tiers?: VendorTier[];
  moderation?: ModerationStatus;
  menu: VendorMenuSection[];
  /** The vendor's signature dishes — exactly four dish names (drawn from their
   *  own visible menu items) they self-select as what they're famous for, shown
   *  as tags on the catalog card. Absent when they haven't chosen four. */
  featured?: string[];
  /** Live counters & services the vendor offers, from the platform add-on set. */
  counters?: VendorCounter[];
  /** Catering categories the vendor serves — the same offering types customers
   *  browse on the frontend (`cateringCategories` ids: full-catering,
   *  single-stall, live-stall, baina-box, essential). */
  serviceCategories?: string[];
  /** The vendor's Baina Box menu (baina-box category). */
  bainaBoxes?: VendorBainaBox[];
  /** The vendor's Essential Service offer (essential category). */
  essentialService?: VendorEssentialService;
  createdAt: string;
  updatedAt: string;
}

const store = createStore<LiveVendorRecord>({
  table: "vendors",
  idField: "id",
});

export function newVendorId(): string {
  return `VEN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/** Default card photo for live vendors (same curated Unsplash set as data.ts). */
export const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=70";

/* ── Seeding ─────────────────────────────────────────────────────────────── */

/** Flatten the fixture `menuCategories` (category → specialist vendors) into
 *  per-vendor records so seeds and live vendors share one shape. */
function seedRecords(): LiveVendorRecord[] {
  const now = new Date(0).toISOString(); // epoch: sorts seeds before live vendors
  return menuCategories.flatMap((cat) =>
    cat.vendors.map((v) => ({
      id: v.id,
      business: v.name,
      city: "Lucknow",
      state: "Uttar Pradesh",
      cuisines: [],
      priceFrom: v.perPlate,
      image: v.image,
      rating: v.rating,
      reviews: v.reviews,
      verified: true,
      moderation: "Approved" as const,
      menu: [
        {
          categoryId: cat.id,
          perPlate: v.perPlate,
          items: v.items.map((it) => ({ name: it.name, diet: it.diet })),
        },
      ],
      createdAt: now,
      updatedAt: now,
    })),
  );
}

/** The curated placeholder specialists from the /vendors catalog
 *  (`vendorListings`) that the home page's category cards land on, mapped to a
 *  booking-menu course + a representative dish list. Keyed by the SAME id as
 *  the catalog listing so a `/book?vendor=<id>` hand-off from a brand card
 *  resolves in `assembleMenuCategories()` and pre-selects the stall (without
 *  this the picked vendor silently vanishes — it exists only in the catalog
 *  id-space, never in the booking menu). Beverages ride the "welcome"
 *  (Welcome Drinks) course, chaat the "chaat" course, caterers "main", the
 *  Baina Box mithai houses "sweets". Catalog caterers that duplicate a wizard
 *  specialist by name (vl-1/2/5/9/11 ↔ Awadhi Royal, Nawabi Dawat, Namma
 *  Ruchi, Chettinad Feast Co., Tandoor Tales) are NOT seeded — the wizard's
 *  hand-off bridges those by name-slug so the roster never shows the same
 *  brand twice. Decor placeholders (vl-21/22) are intentionally omitted —
 *  they're a service, not a food stall. Items default to veg; a `[name,
 *  "non-veg"]` tuple marks the exceptions. */
const PLACEHOLDER_SPECIALIST_MENUS: {
  id: string;
  categoryId: string;
  items: (string | [name: string, diet: DietType])[];
}[] = [
  { id: "vl-16", categoryId: "chaat", items: ["Basket Chaat", "Aloo Tikki Chaat", "Pani Puri", "Dahi Bhalla", "Papdi Chaat", "Matar Tikki"] },
  { id: "vl-17", categoryId: "chaat", items: ["Bhel Puri", "Sev Puri", "Ragda Pattice", "Dahi Puri", "Pani Puri", "Samosa Chaat"] },
  { id: "vl-18", categoryId: "chaat", items: ["Aloo Tikki Chaat", "Ram Ladoo", "Golgappa", "Papdi Chaat", "Dahi Bhalla", "Matar Kulcha"] },
  { id: "vl-19", categoryId: "welcome", items: ["Rose Sharbat", "Khus Sharbat", "Kesar Thandai", "Shikanji", "Aam Panna", "Falsa Sharbat"] },
  { id: "vl-20", categoryId: "welcome", items: ["Virgin Mojito", "Blue Lagoon", "Fruit Punch", "Watermelon Cooler", "Mint Lemonade", "Masala Cola"] },
  // Catalog caterers with no wizard counterpart — bookable on the Main Course.
  { id: "vl-3", categoryId: "main", items: ["Paneer Lababdar", "Dal Makhani", ["Butter Chicken", "non-veg"], ["Mutton Korma", "non-veg"], "Veg Biryani", "Butter Naan"] },
  { id: "vl-4", categoryId: "main", items: ["Puran Poli", "Masale Bhat", "Batata Bhaji", "Amti Dal", "Bharli Vangi", "Solkadhi"] },
  { id: "vl-6", categoryId: "main", items: [["Shorshe Ilish", "non-veg"], ["Kosha Mangsho", "non-veg"], ["Chingri Malai Curry", "non-veg"], "Aloo Posto", "Cholar Dal", "Basanti Pulao"] },
  { id: "vl-7", categoryId: "main", items: [["Hyderabadi Chicken Biryani", "non-veg"], ["Mutton Haleem", "non-veg"], ["Chicken 65", "non-veg"], ["Nihari", "non-veg"], "Mirchi ka Salan", "Double ka Meetha"] },
  { id: "vl-8", categoryId: "main", items: ["Dal Baati Churma", "Gatte ki Sabzi", "Ker Sangri", "Pyaaz Kachori", "Bajre ki Roti", "Papad ki Sabzi"] },
  { id: "vl-10", categoryId: "main", items: ["Veg Manchurian", "Hakka Noodles", "Paneer Chilli", ["Grilled Chicken", "non-veg"], "Veg Au Gratin", "Schezwan Fried Rice"] },
  { id: "vl-12", categoryId: "main", items: ["Sattvik Thali", "Jeera Aloo", "Lauki Kofta", "Sambar Rice", "Curd Rice", "Moong Dal Halwa"] },
  // Baina Box mithai houses — the home Sweets category cards.
  { id: "vl-13", categoryId: "sweets", items: ["Malai Gilori", "Kesar Peda", "Motichoor Ladoo", "Kaju Katli", "Imarti", "Sondesh"] },
  { id: "vl-14", categoryId: "sweets", items: ["Besan Ladoo", "Kesar Barfi", "Gujiya", "Rasmalai", "Dry Fruit Ladoo", "Balushahi"] },
  { id: "vl-15", categoryId: "sweets", items: ["Hazelnut Barfi", "Chocolate Ladoo", "Kaju Katli", "Baklava", "Motichoor Ladoo", "Assorted Mithai Box"] },
];

/** Bookable seed records for the catalog placeholder specialists above. Card
 *  fields (name, city, price, image, tiers…) come straight from the listing so
 *  the catalog and the booking menu can't drift; no `ownerUserId`, so they stay
 *  out of the live-vendor catalog projection (no duplicate card) and skip the
 *  event-city gate (a beverage/chaat brand shows for any city). */
function placeholderSpecialistSeeds(): LiveVendorRecord[] {
  const now = new Date(0).toISOString(); // epoch: sorts with the fixture seeds
  return PLACEHOLDER_SPECIALIST_MENUS.flatMap((spec) => {
    const listing = vendorListings.find((v) => v.id === spec.id);
    if (!listing) return [];
    return [
      {
        id: listing.id,
        business: listing.name,
        city: listing.city,
        state: listing.state,
        cuisines: listing.cuisines,
        priceFrom: listing.priceFrom,
        image: listing.image,
        rating: listing.rating,
        reviews: listing.reviews,
        verified: listing.verified,
        ...(listing.tiers?.length ? { tiers: listing.tiers } : {}),
        moderation: "Approved" as const,
        menu: [
          {
            categoryId: spec.categoryId,
            perPlate: listing.priceFrom,
            items: spec.items.map((it) =>
              typeof it === "string"
                ? { name: it, diet: "veg" as DietType }
                : { name: it[0], diet: it[1] },
            ),
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];
  });
}

/** All vendor records, seeding the fixture specialists on first read. */
export async function ensureSeededVendors(): Promise<LiveVendorRecord[]> {
  const rows = await store.list();
  if (rows.length === 0) {
    const seeds = [...seedRecords(), ...placeholderSpecialistSeeds()];
    await store.upsertMany(seeds);
    return seeds;
  }
  // Back-fill placeholder specialists added after the store was first seeded:
  // seeding only runs on an empty store, so an existing DB would never gain
  // them (and the catalog "Book" hand-off would keep failing to resolve). Only
  // the ids that are actually missing are written — a one-time top-up that
  // never overwrites an admin edit or a re-onboarded vendor on the same id.
  const have = new Set(rows.map((r) => r.id));
  const missing = placeholderSpecialistSeeds().filter((s) => !have.has(s.id));
  if (missing.length === 0) return rows;
  await store.upsertMany(missing);
  return [...rows, ...missing];
}

export async function findVendorByOwner(
  userId: string,
): Promise<LiveVendorRecord | null> {
  const rows = await ensureSeededVendors();
  return rows.find((r) => r.ownerUserId === userId) ?? null;
}

export async function findVendorById(
  id: string,
): Promise<LiveVendorRecord | null> {
  const rows = await ensureSeededVendors();
  return rows.find((r) => r.id === id) ?? null;
}

/** All live (account-owned) vendor records — the admin moderation queue. */
export async function listLiveVendorRecords(): Promise<LiveVendorRecord[]> {
  const rows = await ensureSeededVendors();
  return rows.filter((r) => r.ownerUserId);
}

export function saveVendor(record: LiveVendorRecord): Promise<void> {
  return store.upsert(record);
}

/* ── Customer-facing projections ─────────────────────────────────────────── */

/** Assemble the `MenuCategory[]` consumed by the /book wizard: the static
 *  category taxonomy with every vendor (seed + live) that publishes at least
 *  one dish in that category. Admin-pinned "Top 5" brands lead each roster
 *  they appear in (pin order); everyone else keeps the stored order. */
export async function assembleMenuCategories(): Promise<MenuCategory[]> {
  const [rows, storedPins] = await Promise.all([
    ensureSeededVendors(),
    // A broken pin row must never take the menu down with it.
    readSingleton<TopVendors>(TOP_VENDORS_KEY).catch(() => null),
  ]);
  const { pins } = reconcileTopVendors(storedPins);
  const visible = rows.filter((r) => r.moderation === "Approved");
  return menuCategories.map((cat) => ({
    ...cat,
    vendors: orderByPins(
      pins,
      visible.flatMap((r) => {
      const section = r.menu.find(
        (s) => s.categoryId === cat.id && !s.hidden && s.items.length > 0,
      );
      if (!section) return [];
      return [
        {
          id: r.id,
          name: r.business,
          rating: r.rating,
          reviews: r.reviews,
          ...(r.googleRating ? { googleRating: r.googleRating } : {}),
          ...(r.googleReviews !== undefined
            ? { googleReviews: r.googleReviews }
            : {}),
          perPlate: section.perPlate,
          image: r.image,
          // Tier bands: admin-assigned win, else the price-derived default —
          // identical to the catalog card (`toVendorListing`), so the wizard's
          // tier lens and the /vendors listing agree on where a vendor sits.
          tiers: r.tiers?.length ? sortTiers(r.tiers) : tiersFor(r.priceFrom),
          items: section.items.map((it, i) => ({
            id: `${r.id}-${i}`,
            name: it.name,
            diet: it.diet,
            ...(it.photo ? { photo: it.photo } : {}),
            ...(it.price != null ? { price: it.price } : {}),
          })),
          ...(r.ownerUserId ? { live: true, city: r.city } : {}),
        },
      ];
      }),
    ),
  }));
}

/** Move admin-pinned brands to the front of a roster (pin order, `pinned`
 *  marked so the wizard keeps them above the capped-tier shortlist); the rest
 *  keep their relative order. */
function orderByPins(
  pins: TopVendors["pins"],
  vendors: MenuCategory["vendors"],
): MenuCategory["vendors"] {
  if (!pins.length) return vendors;
  const ranked = vendors.map((v) => ({ v, rank: pinRank(pins, v) }));
  const pinned = ranked
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => ({ ...x.v, pinned: true }));
  const rest = ranked.filter((x) => x.rank < 0).map((x) => x.v);
  return [...pinned, ...rest];
}

/** Catalog card fields derived from a category id. */
const CATEGORY_MEAL_TYPES: Record<string, string[]> = {
  welcome: [],
  starters: ["Starters"],
  live: ["Live Counters"],
  chaat: ["Live Counters"],
  chinese: ["Main Course"],
  "south-indian": ["Breakfast", "Main Course"],
  main: ["Lunch", "Dinner", "Main Course"],
  sweets: ["Desserts"],
};

/** Tier bands mirror the catalog's price-range filter (`PRICE_RANGES`). */
function tiersFor(priceFrom: number): VendorListing["tiers"] {
  if (priceFrom <= 999) return ["Silver", "Gold"];
  if (priceFrom <= 1250) return ["Silver", "Gold", "Platinum"];
  return ["Gold", "Platinum"];
}

/** Project a live vendor record onto the catalog listing shape. Only records
 *  owned by a real vendor account with a published dish are listed — the
 *  platform seeds stay wizard-only (the static catalog already covers them). */
export function toVendorListing(r: LiveVendorRecord): VendorListing {
  const visible = r.menu.filter((s) => !s.hidden && s.items.length > 0);
  const diets = new Set(visible.flatMap((s) => s.items.map((i) => i.diet)));
  const diet: VendorListing["diet"] = diets.has("non-veg")
    ? diets.has("veg")
      ? "Veg & Non-Veg"
      : "Non-Veg"
    : "Veg";
  const mealTypes = Array.from(
    new Set([
      ...visible.flatMap((s) => CATEGORY_MEAL_TYPES[s.categoryId] ?? []),
      // A declared Hi-tea add-on counter advertises the 4–6 PM chai-nasta
      // service on the catalog's "Serves" filter — no menu section maps to it.
      ...(r.counters?.some((c) => c.id === "hi-tea") ? ["Hi-tea"] : []),
    ]),
  );
  return {
    id: r.id,
    name: r.business,
    // Admin-assigned tiers win; price-derived bands are the fallback for seeds
    // and vendors that predate a review decision.
    tiers: r.tiers?.length ? sortTiers(r.tiers) : tiersFor(r.priceFrom),
    rating: r.rating,
    reviews: r.reviews,
    ...(r.googleRating ? { googleRating: r.googleRating } : {}),
    ...(r.googleReviews !== undefined ? { googleReviews: r.googleReviews } : {}),
    city: r.city,
    state: r.state,
    cuisines: r.cuisines,
    mealTypes: mealTypes.length ? mealTypes : ["Main Course"],
    diet,
    priceFrom: r.priceFrom,
    verified: r.verified,
    image: r.image,
    ...(r.serviceCategories?.length
      ? { serviceCategories: r.serviceCategories }
      : {}),
    // Signature dishes: only surface names that still map to a visible menu
    // item (a later menu edit could have removed one). Kept in the vendor's
    // chosen order.
    ...(r.featured?.length
      ? {
          featured: r.featured.filter((name) =>
            visible.some((s) => s.items.some((it) => it.name === name)),
          ),
        }
      : {}),
  };
}

/** Live (account-owned) vendors that have published at least one dish. */
export async function listLiveVendorListings(): Promise<VendorListing[]> {
  const rows = await ensureSeededVendors();
  return rows
    .filter(
      (r) =>
        r.ownerUserId &&
        r.moderation === "Approved" &&
        r.menu.some((s) => !s.hidden && s.items.length > 0),
    )
    .map(toVendorListing);
}

/** Public profile for the /vendors/[id] detail page — a live vendor's visible
 *  menu (per course, with dish photos) plus display fields. Menu category
 *  names/icons come from the static taxonomy so the page needn't re-derive. */
export interface PublicVendorProfile {
  id: string;
  business: string;
  city: string;
  state: string;
  cuisines: string[];
  about?: string;
  priceFrom: number;
  image: string;
  rating: number;
  reviews: number;
  googleRating?: number;
  googleReviews?: number;
  verified: boolean;
  gallery: string[];
  menu: {
    categoryId: string;
    name: string;
    nameHi: string;
    icon: string;
    perPlate: number;
    items: { name: string; diet: DietType; photo?: string; price?: number }[];
  }[];
  /** Live counters & services the vendor offers, resolved for display. */
  counters: {
    id: string;
    name: string;
    nameHi: string;
    icon: string;
    price: number;
    perPlate: boolean;
    category: string;
  }[];
  /** Catering categories the vendor serves, resolved for display — the same
   *  offering types the customer frontend sells (see `cateringCategories`). */
  serviceCategories: {
    id: string;
    name: string;
    nameHi: string;
    icon: string;
  }[];
  /** The vendor's Baina Box menu (empty when they don't sell boxes). */
  bainaBoxes: VendorBainaBox[];
  /** The vendor's Essential Service offer, or null when not offered. */
  essentialService: VendorEssentialService | null;
}

/** Resolve a vendor's declared counter ids into display rows (name/icon/price),
 *  falling back to the platform default price when the vendor set none. Shared
 *  by the public profile and any other counter-facing surface. */
/** Map counter/service *labels* (as captured by the registration wizard) back
 *  onto platform offering ids, so a first-time dashboard prefills what the
 *  vendor already declared. Labels with no matching offering are dropped. */
export function countersFromLabels(
  labels: string[] | undefined,
): VendorCounter[] {
  if (!labels?.length) return [];
  const seen = new Set<string>();
  return labels.flatMap((label) => {
    const o = vendorOfferings.find(
      (v) => v.name.toLowerCase() === label.trim().toLowerCase(),
    );
    if (!o || seen.has(o.id)) return [];
    seen.add(o.id);
    return [{ id: o.id }];
  });
}

/** Resolve declared catering-category ids into display rows (name/icon),
 *  dropping any id no longer in the platform list. */
export function resolveServiceCategories(
  ids: string[] | undefined,
): PublicVendorProfile["serviceCategories"] {
  if (!ids?.length) return [];
  return ids.flatMap((id) => {
    const c = cateringCategories.find((cat) => cat.id === id);
    return c ? [{ id: c.id, name: c.name, nameHi: c.nameHi, icon: c.icon }] : [];
  });
}

export function resolveVendorCounters(
  counters: VendorCounter[] | undefined,
): PublicVendorProfile["counters"] {
  if (!counters?.length) return [];
  return counters.flatMap((c) => {
    const o = vendorOfferings.find((v) => v.id === c.id);
    if (!o) return [];
    return [
      {
        id: o.id,
        name: o.name,
        nameHi: o.nameHi,
        icon: o.icon,
        price: c.price ?? o.price,
        perPlate: o.perPlate,
        category: o.category,
      },
    ];
  });
}

/** Project a record for the public detail page, or null when the vendor
 *  shouldn't be shown (not live, taken down, or nothing published). */
export function toPublicVendorProfile(
  r: LiveVendorRecord,
  gallery: string[],
): PublicVendorProfile | null {
  if (!r.ownerUserId || r.moderation !== "Approved") return null;
  const visible = r.menu.filter((s) => !s.hidden && s.items.length > 0);
  if (visible.length === 0) return null;
  return {
    id: r.id,
    business: r.business,
    city: r.city,
    state: r.state,
    cuisines: r.cuisines,
    about: r.about,
    priceFrom: r.priceFrom,
    image: r.image,
    rating: r.rating,
    reviews: r.reviews,
    ...(r.googleRating ? { googleRating: r.googleRating } : {}),
    ...(r.googleReviews !== undefined ? { googleReviews: r.googleReviews } : {}),
    verified: r.verified,
    gallery,
    menu: visible.flatMap((s) => {
      const cat = menuCategories.find((c) => c.id === s.categoryId);
      if (!cat) return [];
      return [
        {
          categoryId: s.categoryId,
          name: cat.name,
          nameHi: cat.nameHi,
          icon: cat.icon,
          perPlate: s.perPlate,
          items: s.items,
        },
      ];
    }),
    counters: resolveVendorCounters(r.counters),
    serviceCategories: resolveServiceCategories(r.serviceCategories),
    bainaBoxes: r.bainaBoxes ?? [],
    essentialService: r.essentialService ?? null,
  };
}

/* ── Validation (PUT /api/vendor/menu) ───────────────────────────────────── */

const CATEGORY_IDS = new Set(menuCategories.map((c) => c.id));
const MAX_SECTIONS = menuCategories.length;
const MAX_ITEMS_PER_SECTION = 24;
/** Signature dishes are all-or-nothing: a vendor features exactly this many, or
 *  none at all (a new vendor with fewer dishes simply skips it). */
const FEATURED_COUNT = 4;
const MAX_CUISINES = 12;
const MAX_BAINA_BOXES = 12;
const MAX_BOX_CUSTOM_SIZES = 4;
const MAX_ESSENTIAL_INCLUDES = 20;
/** Allow-list of live-counter / service ids a vendor may declare. */
const OFFERING_IDS = new Set(vendorOfferingIds);

/** Only our own photo-serving route is a valid dish-photo URL. */
const PHOTO_URL_RE = /^\/api\/vendor\/photo\/[A-Za-z0-9-]{1,64}$/;

/** The photo id inside a `/api/vendor/photo/<id>` URL, or null. */
export function photoIdFromUrl(url: string): string | null {
  return PHOTO_URL_RE.test(url) ? url.split("/").pop()! : null;
}

export interface VendorMenuInput {
  business: string;
  city: string;
  state: string;
  cuisines: string[];
  about?: string;
  priceFrom: number;
  maxCapacity?: number;
  maxEventsPerDay?: number;
  googleRating?: number;
  googleReviews?: number;
  menu: VendorMenuSection[];
  /** Signature dishes — exactly four visible dish names (or none). */
  featured?: string[];
  counters?: VendorCounter[];
  serviceCategories?: string[];
  bainaBoxes?: VendorBainaBox[];
  essentialService?: VendorEssentialService;
  /** Self-selected marketplace tier bands (absent = keep assigned/derived). */
  tiers?: VendorTier[];
}

type BainaBoxesCheck =
  | { ok: true; value: VendorBainaBox[] }
  | { ok: false; error: string };

/** Validate + normalize a vendor's Baina Box list. Blank rows are dropped; a
 *  named box without a valid ½ kg price is a hard error (it would render
 *  priceless). The 1 kg price and any extra custom sizes (label + price) are
 *  optional — boxes without them sell in ½ kg only. Photos must be our own
 *  photo-serving URLs — ownership is verified by the menu route. Shared by
 *  the registration application route and the dashboard menu save. */
export function cleanBainaBoxes(v: unknown): BainaBoxesCheck {
  const boxes: VendorBainaBox[] = [];
  if (!Array.isArray(v)) return { ok: true, value: boxes };
  for (const raw of v.slice(0, MAX_BAINA_BOXES)) {
    const b = (raw ?? {}) as Record<string, unknown>;
    const name = cleanString(b.name, 60);
    const contents = cleanString(b.contents, 200);
    if (!name && !contents) continue;
    const price = cleanMoney(b.price, 100000);
    if (!name || price === null || price <= 0) {
      return {
        ok: false,
        error: "Each Baina Box needs a name and a ½ kg box price.",
      };
    }
    const price1kg = cleanMoney(b.price1kg, 100000);
    const customSizes: VendorBoxSize[] = [];
    for (const rawSize of (Array.isArray(b.customSizes)
      ? b.customSizes
      : []
    ).slice(0, MAX_BOX_CUSTOM_SIZES)) {
      const s = (rawSize ?? {}) as Record<string, unknown>;
      const label = cleanString(s.label, 24);
      const sizePrice = cleanMoney(s.price, 100000);
      const priced = sizePrice !== null && sizePrice > 0;
      if (!label && !priced) continue;
      if (!label || !priced) {
        return {
          ok: false,
          error: "Each custom box size needs a label and a price.",
        };
      }
      customSizes.push({ label, price: sizePrice });
    }
    const photo =
      typeof b.photo === "string" && PHOTO_URL_RE.test(b.photo)
        ? b.photo
        : undefined;
    boxes.push({
      name,
      contents,
      price,
      ...(price1kg !== null && price1kg > 0 ? { price1kg } : {}),
      ...(customSizes.length ? { customSizes } : {}),
      ...(photo ? { photo } : {}),
    });
  }
  return { ok: true, value: boxes };
}

/** Normalize a vendor's Essential Service offer — per-guest rate (0 allowed:
 *  the platform tier starts at ₹0) plus deduped includes. Undefined when it
 *  says nothing. Shared by the application route and the menu save. */
export function cleanEssentialService(
  v: unknown,
): VendorEssentialService | undefined {
  if (!v || typeof v !== "object") return undefined;
  const e = v as Record<string, unknown>;
  const perGuest = cleanMoney(e.perGuest, 10000) ?? 0;
  const seen = new Set<string>();
  const includes = (Array.isArray(e.includes) ? e.includes : [])
    .map((it) => cleanString(it, 60))
    .filter((it) => {
      if (!it || seen.has(it.toLowerCase())) return false;
      seen.add(it.toLowerCase());
      return true;
    })
    .slice(0, MAX_ESSENTIAL_INCLUDES);
  return perGuest > 0 || includes.length > 0
    ? { perGuest, includes }
    : undefined;
}

/** Keep only known catering-category ids, deduped, in platform order. Shared
 *  by the registration application route and the dashboard menu save. */
export function cleanCateringCategories(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const picked = new Set(
    v.filter((id): id is string => typeof id === "string").map((id) => id.trim()),
  );
  return cateringCategoryIds.filter((id) => picked.has(id));
}

/** Normalize a self-declared Google rating (0–5, one decimal). Returns
 *  undefined for blank / zero / out-of-range so the badge simply doesn't show.
 *  Shared by the registration application route and the dashboard menu save. */
export function cleanGoogleRating(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > 5) {
    return undefined;
  }
  return Math.round(n * 10) / 10;
}

/** Normalize a self-declared Google review count (non-negative integer, capped
 *  well above any real caterer's total). Undefined when blank / invalid. */
export function cleanGoogleReviews(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10_000_000) {
    return undefined;
  }
  return Math.floor(n);
}

type Check = { ok: true; value: VendorMenuInput } | { ok: false; error: string };

const cleanString = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const cleanMoney = (v: unknown, max: number): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n);
};

/** Validate + normalize the body of PUT /api/vendor/menu. */
export function validateVendorMenuInput(body: Record<string, unknown>): Check {
  const business = cleanString(body.business, 80);
  if (business.length < 2) {
    return { ok: false, error: "Business name is required." };
  }
  const city = cleanString(body.city, 60);
  if (!city) return { ok: false, error: "City is required." };
  const state = cleanString(body.state, 60);

  const cuisines = Array.isArray(body.cuisines)
    ? body.cuisines
        .map((c) => cleanString(c, 30))
        .filter(Boolean)
        .slice(0, MAX_CUISINES)
    : [];

  const about = cleanString(body.about, 500);

  const priceFrom = cleanMoney(body.priceFrom, 100000);
  if (priceFrom === null) {
    return { ok: false, error: "Base per-plate price must be a valid amount." };
  }

  // Capacity limits — optional; kept only when a positive value is supplied.
  const maxCapacity = cleanMoney(body.maxCapacity, 100000);
  const maxEventsPerDay = cleanMoney(body.maxEventsPerDay, 100);

  // Vendor-declared Google reputation — optional; only kept when a valid,
  // positive rating is supplied (the count without a rating shows nothing).
  const googleRating = cleanGoogleRating(body.googleRating);
  const googleReviews = googleRating
    ? cleanGoogleReviews(body.googleReviews)
    : undefined;

  if (!Array.isArray(body.menu) || body.menu.length > MAX_SECTIONS) {
    return { ok: false, error: "Invalid menu." };
  }
  const seen = new Set<string>();
  const menu: VendorMenuSection[] = [];
  for (const raw of body.menu) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const categoryId = cleanString(s.categoryId, 30);
    if (!CATEGORY_IDS.has(categoryId)) {
      return { ok: false, error: `Unknown menu category "${categoryId}".` };
    }
    if (seen.has(categoryId)) continue; // ignore duplicates
    seen.add(categoryId);

    const perPlate = cleanMoney(s.perPlate, 10000);
    if (perPlate === null) {
      return { ok: false, error: "Per-plate price must be a valid amount." };
    }
    if (!Array.isArray(s.items) || s.items.length > MAX_ITEMS_PER_SECTION) {
      return { ok: false, error: "Too many dishes in one category." };
    }
    const items: VendorMenuItem[] = [];
    for (const rawItem of s.items) {
      const it = (rawItem ?? {}) as Record<string, unknown>;
      const name = cleanString(it.name, 60);
      if (!name) continue;
      const diet: DietType = it.diet === "non-veg" ? "non-veg" : "veg";
      // Dish photos must be our own photo URLs; ownership is verified by the
      // route (it strips references to photos the vendor doesn't own).
      const photo =
        typeof it.photo === "string" && PHOTO_URL_RE.test(it.photo)
          ? it.photo
          : undefined;
      // Per-delicacy price — kept only when a positive amount is supplied; the
      // Single-Stall requirement below rejects the save if any visible plated
      // dish is left without one.
      const price = cleanMoney(it.price, 100000);
      items.push({
        name,
        diet,
        ...(photo ? { photo } : {}),
        ...(price !== null && price > 0 ? { price } : {}),
      });
    }
    menu.push({
      categoryId,
      perPlate,
      items,
      ...(s.hidden === true ? { hidden: true } : {}),
    });
  }

  // Signature dishes — exactly four of the vendor's own dish names (or none).
  // Each must match a dish in a non-hidden section (i.e. one customers can see);
  // unknown / duplicate names are dropped, and the chosen order is preserved.
  const visibleDishNames = new Set(
    menu.filter((s) => !s.hidden).flatMap((s) => s.items.map((it) => it.name)),
  );
  const featured: string[] = [];
  if (Array.isArray(body.featured)) {
    const seenFeatured = new Set<string>();
    for (const raw of body.featured) {
      const name = cleanString(raw, 60);
      if (!name || seenFeatured.has(name) || !visibleDishNames.has(name)) continue;
      seenFeatured.add(name);
      featured.push(name);
    }
  }
  if (featured.length !== 0 && featured.length !== FEATURED_COUNT) {
    return {
      ok: false,
      error: `Feature exactly ${FEATURED_COUNT} signature dishes from your menu, or none at all.`,
    };
  }

  // Live counters & services — each must be a known platform offering; an
  // optional own-price overrides the platform default. Duplicates are dropped.
  const counters: VendorCounter[] = [];
  if (Array.isArray(body.counters)) {
    const seenCounters = new Set<string>();
    for (const raw of body.counters.slice(0, OFFERING_IDS.size)) {
      const c = (raw ?? {}) as Record<string, unknown>;
      const id = cleanString(c.id, 30);
      if (!OFFERING_IDS.has(id) || seenCounters.has(id)) continue;
      seenCounters.add(id);
      const price = cleanMoney(c.price, 1_000_000);
      counters.push({ id, ...(price ? { price } : {}) });
    }
  }

  // Self-selected marketplace tiers — unknown values dropped, canonical order.
  // An empty selection is omitted so the route's assigned/existing fallback
  // (and ultimately the price-derived default) still applies.
  const tiers = parseTiers(body.tiers);

  // Baina Boxes + Essential Service — via the shared cleaners (also used by
  // the registration application route).
  const boxesCheck = cleanBainaBoxes(body.bainaBoxes);
  if (!boxesCheck.ok) return boxesCheck;
  const bainaBoxes = boxesCheck.value;
  const essentialService = cleanEssentialService(body.essentialService);

  // Catering categories — the customer-facing offering types the vendor
  // serves. Unknown ids are dropped, and a category whose builder has content
  // is always declared (the declaration and the menu can't drift apart).
  // Order follows the platform list.
  const declared = new Set(cleanCateringCategories(body.serviceCategories));
  if (bainaBoxes.length) declared.add("baina-box");
  if (essentialService) declared.add("essential");
  const serviceCategories = cateringCategoryIds.filter((id) =>
    declared.has(id),
  );

  return {
    ok: true,
    value: {
      business,
      city,
      state,
      cuisines,
      about,
      priceFrom,
      ...(maxCapacity ? { maxCapacity } : {}),
      ...(maxEventsPerDay ? { maxEventsPerDay } : {}),
      ...(googleRating ? { googleRating } : {}),
      ...(googleReviews !== undefined ? { googleReviews } : {}),
      menu,
      ...(featured.length ? { featured } : {}),
      ...(counters.length ? { counters } : {}),
      ...(serviceCategories.length ? { serviceCategories } : {}),
      ...(bainaBoxes.length ? { bainaBoxes } : {}),
      ...(essentialService ? { essentialService } : {}),
      ...(tiers.length ? { tiers } : {}),
    },
  };
}
