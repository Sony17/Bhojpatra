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
import { createStore } from "@/lib/store";
import {
  menuCategories,
  type DietType,
  type MenuCategory,
  type VendorListing,
} from "@/lib/data";
import { sortTiers, type VendorTier } from "@/lib/admin/types";

export interface VendorMenuItem {
  name: string;
  diet: DietType;
  /** Same-origin dish photo URL (`/api/vendor/photo/<id>`), owned by the vendor. */
  photo?: string;
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
  /** Admin-assigned marketplace tiers, inherited from the linked application.
   *  Overrides the price-derived default on the catalog card when present. */
  tiers?: VendorTier[];
  moderation?: ModerationStatus;
  menu: VendorMenuSection[];
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

/** All vendor records, seeding the fixture specialists on first read. */
export async function ensureSeededVendors(): Promise<LiveVendorRecord[]> {
  const rows = await store.list();
  if (rows.length > 0) return rows;
  const seeds = seedRecords();
  await store.upsertMany(seeds);
  return seeds;
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
 *  one dish in that category. */
export async function assembleMenuCategories(): Promise<MenuCategory[]> {
  const rows = await ensureSeededVendors();
  const visible = rows.filter((r) => r.moderation === "Approved");
  return menuCategories.map((cat) => ({
    ...cat,
    vendors: visible.flatMap((r) => {
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
          items: section.items.map((it, i) => ({
            id: `${r.id}-${i}`,
            name: it.name,
            diet: it.diet,
            ...(it.photo ? { photo: it.photo } : {}),
          })),
          ...(r.ownerUserId ? { live: true, city: r.city } : {}),
        },
      ];
    }),
  }));
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
    new Set(visible.flatMap((s) => CATEGORY_MEAL_TYPES[s.categoryId] ?? [])),
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
    items: { name: string; diet: DietType; photo?: string }[];
  }[];
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
  };
}

/* ── Validation (PUT /api/vendor/menu) ───────────────────────────────────── */

const CATEGORY_IDS = new Set(menuCategories.map((c) => c.id));
const MAX_SECTIONS = menuCategories.length;
const MAX_ITEMS_PER_SECTION = 24;
const MAX_CUISINES = 8;

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
      items.push({ name, diet, ...(photo ? { photo } : {}) });
    }
    menu.push({
      categoryId,
      perPlate,
      items,
      ...(s.hidden === true ? { hidden: true } : {}),
    });
  }

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
    },
  };
}
