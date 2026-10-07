/**
 * Storefront ↔ Single Stall hand-off — the pure helpers every customer vendor
 * surface (/vendors catalog, /vendors/[id], its full menu, compare) uses to
 * decide WHAT its "Book" button sells, WHERE it goes, and WHICH price sits next
 * to it.
 *
 * The rule: a Book CTA that lands in the Single Stall wizard must quote the
 * price the wizard will charge, i.e. the stall's own `/api/menu` course rate —
 * never the catalog card's indicative feast price. A curated seed listing whose
 * catalog id is not in the booking roster is bridged to its roster counterpart
 * by brand name, exactly as `StallBookingWizard` does, so both sides agree on
 * which stall (and price) the guest gets. Live vendors match by id only.
 *
 * Pure and dependency-light so it runs on the server (page loaders,
 * `/api/vendors`) and the client alike, and is unit-tested in
 * `vendorStorefront.test.ts`.
 */
import {
  cities,
  listingCateringCategories,
  type CategoryItem,
  type MenuCategory,
  type StallTerms,
  type VendorListing,
} from "@/lib/data";

/** A vendor-name slug ("Awadhi Royal Caterers" → "awadhi-royal-caterers"). */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Brand key tolerating the catalog listing's trailing "Caterers" — the SAME
 *  bridge `StallBookingWizard` applies to a `?vendor=` it can't find by id. */
export function brandKey(name: string): string {
  return slugify(name).replace(/-caterers$/, "");
}

/** One course a bookable stall sells, as the wizard will sell it. */
export interface StallCourseSummary {
  categoryId: string;
  name: string;
  nameHi: string;
  icon: string;
  /** Per-plate rate the wizard bills for a set (fixed) course. */
  perPlate: number;
  /** Set menu (every dish served, billed per plate) vs pick-your-dishes. */
  fixed: boolean;
  items: Pick<CategoryItem, "name" | "diet" | "price" | "photo">[];
}

/** Everything a storefront needs about the stall its Book button sells. */
export interface BookableStall {
  /** The booking-roster id the wizard resolves (may differ from the listing's
   *  id for a bridged curated seed). */
  stallId: string;
  name: string;
  /** Cheapest entry point, computed exactly like the wizard's stall card. */
  fromPerPlate: number;
  dishCount: number;
  courses: StallCourseSummary[];
  /** Largest minimum-guest requirement across the vendor's terms (vendor-wide
   *  `minPax` and per-course `minPaxGuarantee`). Absent = none declared. */
  minGuests?: number;
  /** Advance notice the vendor needs, in hours. Absent = platform default. */
  leadHours?: number;
}

/** The compact slice the catalog cards need (shipped by `/api/vendors`). */
export type StallBrief = Pick<
  BookableStall,
  "stallId" | "fromPerPlate" | "minGuests" | "leadHours"
>;

export function briefOf(s: BookableStall): StallBrief {
  return {
    stallId: s.stallId,
    fromPerPlate: s.fromPerPlate,
    ...(s.minGuests ? { minGuests: s.minGuests } : {}),
    ...(s.leadHours ? { leadHours: s.leadHours } : {}),
  };
}

interface Collected extends BookableStall {
  rating: number;
  pinned: boolean;
}

/** Collapse the per-course `/api/menu` roster into one stall per vendor — the
 *  same fold `StallBookingWizard` performs (no city filter: the storefront
 *  link always carries the vendor's own city). Ordered like the wizard's list
 *  (pinned first, then best rated) so a name bridge picks the same stall. */
export function collectStalls(categories: MenuCategory[]): BookableStall[] {
  const byId = new Map<string, Collected>();
  for (const cat of categories) {
    for (const v of cat.vendors) {
      if (!v.items.length) continue;
      const course: StallCourseSummary = {
        categoryId: cat.id,
        name: cat.name,
        nameHi: cat.nameHi,
        icon: cat.icon,
        perPlate: v.perPlate,
        fixed: v.menuType !== "varied",
        items: v.items.map((it) => ({
          name: it.name,
          diet: it.diet,
          ...(it.price != null ? { price: it.price } : {}),
          ...(it.photo ? { photo: it.photo } : {}),
        })),
      };
      const terms: StallTerms | undefined = v.stallTerms;
      const minGuests = Math.max(
        terms?.minPax ?? 0,
        terms?.minPaxGuarantee ?? 0,
      );
      const leadHours =
        terms?.leadHours ??
        (typeof v.leadDays === "number" ? v.leadDays * 24 : undefined);
      const existing = byId.get(v.id);
      if (existing) {
        existing.courses.push(course);
        if (minGuests > (existing.minGuests ?? 0)) existing.minGuests = minGuests;
        if (leadHours != null && leadHours > (existing.leadHours ?? -1))
          existing.leadHours = leadHours;
        continue;
      }
      byId.set(v.id, {
        stallId: v.id,
        name: v.name,
        fromPerPlate: 0,
        dishCount: 0,
        courses: [course],
        ...(minGuests > 0 ? { minGuests } : {}),
        ...(leadHours != null ? { leadHours } : {}),
        rating: v.rating,
        pinned: Boolean(v.pinned),
      });
    }
  }
  const list = Array.from(byId.values());
  for (const s of list) {
    // A set menu costs its per-plate rate whole; a varied one starts at its
    // cheapest dish (a dish with no own price bills the course rate).
    const prices = s.courses.flatMap((c) =>
      c.fixed ? [c.perPlate] : c.items.map((it) => it.price ?? c.perPlate),
    );
    s.fromPerPlate = prices.length ? Math.min(...prices) : 0;
    s.dishCount = s.courses.reduce((n, c) => n + c.items.length, 0);
  }
  list.sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.rating - a.rating,
  );
  return list.map((c) => ({
    stallId: c.stallId,
    name: c.name,
    fromPerPlate: c.fromPerPlate,
    dishCount: c.dishCount,
    courses: c.courses,
    ...(c.minGuests ? { minGuests: c.minGuests } : {}),
    ...(c.leadHours != null ? { leadHours: c.leadHours } : {}),
  }));
}

/** The stall a storefront's Book button sells, or null when the vendor has
 *  none in the booking roster. Matches by id; `allowNameBridge` (curated static
 *  seeds ONLY) then falls back to the brand-name bridge the wizard uses. */
export function resolveBookableStall(
  vendor: { id: string; name: string },
  stalls: BookableStall[],
  { allowNameBridge }: { allowNameBridge: boolean },
): BookableStall | null {
  const byId = stalls.find((s) => s.stallId === vendor.id);
  if (byId) return byId;
  if (!allowNameBridge) return null;
  const key = brandKey(vendor.name);
  return stalls.find((s) => brandKey(s.name) === key) ?? null;
}

/** The query params that carry a vendor's city into a booking wizard: the
 *  static city id when we know it, else the free-text "Other" city (`loc=`),
 *  which both wizards accept — so a vendor from an admin-added city still
 *  lands with its city set rather than silently dropped. */
export function cityParams(city: string | undefined): Record<string, string> {
  const name = city?.trim();
  if (!name) return {};
  const known = cities.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return known ? { city: known.id } : { loc: name };
}

/** `/book/stall?vendor=…&city=…` — the one Single Stall hand-off href every
 *  storefront surface uses. */
export function stallBookHref({
  vendorId,
  city,
  counter,
}: {
  vendorId: string;
  city?: string;
  counter?: string;
}): string {
  const sp = new URLSearchParams({ vendor: vendorId, ...cityParams(city) });
  if (counter) sp.set("counter", counter);
  return `/book/stall?${sp.toString()}`;
}

/** What a vendor's primary CTA does. */
export type ListingCta =
  /** Single Stall booking — `price` is the stall's own per-plate rate when
   *  known (undefined only while the roster is still loading). */
  | { kind: "stall"; href: string; price?: number }
  /** Baina Box order panel (boxes are ordered per box, not per plate). */
  | { kind: "baina"; href: string }
  /** A full-catering caterer with no stall — the feast wizard, which rosters
   *  them course by course. */
  | { kind: "feast"; href: string }
  /** An Essential Service (crew & setup) offer — the service packages page. */
  | { kind: "service"; href: string }
  /** Nothing bookable online (decor, …) — talk to the team. */
  | { kind: "enquire"; href: string };

export const ENQUIRY_HREF = "/contact";
export const SERVICE_HREF = "/service-packages";

/**
 * The single CTA decision every storefront surface shares.
 *  • `categories` — the catering categories the vendor sells (declared, or
 *    derived for curated samples).
 *  • `stall` — the bookable stall: an object when the roster has one,
 *    `null` when it has none, `undefined` while not yet resolved (we then
 *    trust the declared categories rather than flash an enquiry button).
 *  • `bainaHref` — where this vendor's Baina Boxes are ordered, when they
 *    have an order panel.
 */
export function storefrontCta(input: {
  id: string;
  city?: string;
  categories: string[];
  stall: { fromPerPlate: number } | null | undefined;
  bainaHref?: string;
  counter?: string;
}): ListingCta {
  const { categories: cats, stall } = input;
  if (cats.includes("single-stall") && stall !== null) {
    return {
      kind: "stall",
      href: stallBookHref({
        vendorId: input.id,
        city: input.city,
        counter: input.counter,
      }),
      // A ₹0 roster rate means "not priced yet" — never quote it.
      ...(stall && stall.fromPerPlate > 0 ? { price: stall.fromPerPlate } : {}),
    };
  }
  if (input.bainaHref && cats.includes("baina-box")) {
    return { kind: "baina", href: input.bainaHref };
  }
  if (cats.includes("full-catering")) {
    const qs = new URLSearchParams(cityParams(input.city)).toString();
    return { kind: "feast", href: `/book${qs ? `?${qs}` : ""}` };
  }
  if (cats.includes("essential")) return { kind: "service", href: SERVICE_HREF };
  return { kind: "enquire", href: ENQUIRY_HREF };
}

/** A catalog listing's CTA. `opts.bainaHref` (the Baina Box lens) wins
 *  outright — the card then sells boxes whatever else the vendor does. */
export function listingCta(
  listing: VendorListing,
  opts: { counter?: string; bainaHref?: string } = {},
): ListingCta {
  if (opts.bainaHref) return { kind: "baina", href: opts.bainaHref };
  return storefrontCta({
    id: listing.id,
    city: listing.city,
    categories: listingCateringCategories(listing),
    stall: listing.stall,
    // Real vendors order boxes from the panel on their own profile; curated
    // samples have no such panel on theirs.
    ...(listing.sample ? {} : { bainaHref: `/vendors/${listing.id}#baina-order` }),
    counter: opts.counter,
  });
}

/** Bilingual label for a CTA kind. */
export function ctaLabel(
  kind: ListingCta["kind"],
  t: (en: string, hi: string) => string,
): string {
  switch (kind) {
    case "stall":
      return t("Book", "बुक");
    case "baina":
      return t("Order", "ऑर्डर");
    case "feast":
      return t("Plan feast", "भोज प्लान करें");
    case "service":
      return t("View service", "सर्विस देखें");
    default:
      return t("Enquire", "पूछताछ");
  }
}

/** "Book 2 days ahead" style copy for a lead time in hours (bilingual via the
 *  caller's `t`). Null when the vendor declared none. */
export function leadTimeLabel(
  hours: number | undefined,
  t: (en: string, hi: string) => string,
): string | null {
  if (hours == null) return null;
  if (hours <= 0) return t("Same-day orders accepted", "उसी दिन ऑर्डर स्वीकार");
  if (hours < 24) return t(`Book ${hours} hrs ahead`, `${hours} घंटे पहले बुक करें`);
  const days = Math.ceil(hours / 24);
  return t(
    `Book ${days} ${days === 1 ? "day" : "days"} ahead`,
    `${days} दिन पहले बुक करें`,
  );
}

/** listing id → the stall its Book button sells (or null), for a whole
 *  catalog. Curated samples may bridge by brand name; real vendors by id only. */
export function stallBriefsFor(
  listings: { id: string; name: string; sample?: boolean }[],
  stalls: BookableStall[],
): Record<string, StallBrief | null> {
  const out: Record<string, StallBrief | null> = {};
  for (const l of listings) {
    const s = resolveBookableStall(l, stalls, {
      allowNameBridge: Boolean(l.sample),
    });
    out[l.id] = s ? briefOf(s) : null;
  }
  return out;
}

/** A live vendor profile's CTA (storefront, full menu): declared categories
 *  drive it; a legacy record with none falls back to what it has published.
 *  Baina Boxes are ordered from the profile's own panel (`#baina-order`). */
export function profileCta(
  profile: {
    id: string;
    city: string;
    serviceCategories: { id: string }[];
    bainaBoxes: unknown[];
    essentialService: unknown;
  },
  stall: { fromPerPlate: number } | null,
  { bainaHref = "#baina-order" }: { bainaHref?: string } = {},
): ListingCta {
  const declared = profile.serviceCategories.map((c) => c.id);
  const hasBoxes = profile.bainaBoxes.length > 0;
  return storefrontCta({
    id: profile.id,
    city: profile.city,
    categories: declared.length
      ? declared
      : [
          ...(stall ? ["single-stall"] : []),
          ...(hasBoxes ? ["baina-box"] : []),
          ...(profile.essentialService ? ["essential"] : []),
        ],
    stall,
    bainaHref: hasBoxes ? bainaHref : undefined,
  });
}
