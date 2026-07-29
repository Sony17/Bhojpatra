/**
 * Venue helpers — shared between the venue catalogue, the venue-owner
 * registration panel, the standalone venue booking flow and the catering
 * wizard (which can fold a venue fee into a feast order).
 *
 * Venues come from two places:
 *   • the curated static seed in `data.ts` (`venues`), and
 *   • owner-registered venues persisted to `data/venues.json` via `/api/venues`
 *     (a Venue-Owner partner publishes these from their dashboard).
 *
 * Both are surfaced together so a registered venue lists, is selectable and is
 * bookable exactly like a seed venue. There's no venue pricing engine — the
 * booking fee is the venue's headline price (numeric `price`, parsed from the
 * display `priceFrom` for seed venues).
 */

import { venues as staticVenues, cities, type Venue } from "@/lib/data";
import { money } from "@/lib/money";

/** Booking fee → 18% GST, with a 10% advance to lock the date (matches the
 *  catering wizard's conventions). */
export const VENUE_GST_RATE = 0.18;
export const VENUE_ADVANCE_RATE = 0.1;

/** Approval state for owner-registered venues — a pre-approval model: a newly
 *  published venue is "Pending" and stays OFF every customer surface (catalogue,
 *  detail page, booking flow) until an admin marks it "Approved"; "Hidden" is an
 *  admin takedown. Legacy records saved before approvals carry no status and are
 *  grandfathered as visible. */
export type VenueStatus = "Pending" | "Approved" | "Hidden";

/** The fixed venue-type vocabulary used across the seed catalogue + filters. */
export const VENUE_TYPES = [
  "Banquet Hall",
  "Open Lawn",
  "Convention Center",
  "Hotel Ballroom",
  "Resort",
  "Heritage Venue",
] as const;

/** The space categories a venue can offer, each priced separately. */
export type VenueSpaceKey =
  | "banquet"
  | "lawn"
  | "terrace"
  | "conference"
  | "rooms";

/** An owner-chosen space a venue offers, with its own booking fee in ₹. */
export interface VenueSpacePrice {
  key: VenueSpaceKey;
  price: number;
}

/** Cap on the photos a venue lists (cover = first). */
export const VENUE_MAX_IMAGES = 8;

/**
 * An owner-registered venue as persisted on disk (`data/venues.json`). Mirrors
 * the seed `Venue` shape, plus a numeric booking fee and owner attribution so
 * the venue's bookings can be credited back to the Venue-Owner partner.
 */
export interface VenueRecord {
  id: string;
  name: string;
  city: string; // matches an id in `cities`
  location: string;
  type: string;
  capacity: string;
  /** Display price, e.g. "₹85,000". */
  priceFrom: string;
  /** Numeric booking fee in ₹ — what the standalone booking charges. */
  price: number;
  rating: number;
  reviews: number;
  image: string;
  /** Full ordered photo gallery (first = cover). `image` mirrors the first
   *  entry so single-image consumers keep working. Absent on legacy records. */
  images?: string[];
  /** The spaces this venue offers with owner-set prices. Absent on legacy
   *  records, whose spaces are derived from the headline fee instead. */
  spaces?: VenueSpacePrice[];
  /** Referral code of the Venue-Owner partner who published this venue. */
  ownerCode: string;
  ownerName?: string;
  phone?: string;
  createdAt: string;
  /** Admin approval state (see `VenueStatus`). Absent on legacy records = live. */
  status?: VenueStatus;
  /** Admin has verified the venue's details (owner identity, location, capacity)
   *  after reviewing the application. A venue must be verified before it can be
   *  published (`status` → "Approved"). Absent on legacy records = grandfathered
   *  as verified so nothing already live is gated. */
  verified?: boolean;
  /** Soft-deleted by its owner; hidden from the catalogue and lookups. */
  deleted?: boolean;
}

/**
 * A venue ready to be booked — the seed `Venue` fields plus a numeric fee and
 * (for owner-registered venues) the owner's attribution. `registered` marks the
 * owner-published ones apart from the static seed catalogue.
 */
export interface BookableVenue extends Venue {
  price: number;
  images?: string[];
  spaces?: VenueSpacePrice[];
  ownerCode?: string;
  ownerName?: string;
  phone?: string;
  registered?: boolean;
}

/** Fallback venue photo used when an owner submits no (or an unusable) image URL. */
export const DEFAULT_VENUE_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=70";

/** Remote hosts `next/image` can optimize — keep in sync with
 *  `images.remotePatterns` in next.config.ts. */
const VENUE_IMAGE_HOSTS = ["images.unsplash.com", "plus.unsplash.com"];
const VENUE_IMAGE_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Whether `next/image` can actually serve this source: a local `/public` path
 * or a remote host whitelisted under `images.remotePatterns` in
 * next.config.ts. Owners paste things like an unsplash.com *page* link (not an
 * image file), which would crash every card that renders it.
 */
export function isServableVenueImage(src: string | undefined): boolean {
  const url = (src ?? "").trim();
  if (url.startsWith("/")) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (VENUE_IMAGE_HOSTS.includes(hostname) ||
        hostname.endsWith(VENUE_IMAGE_HOST_SUFFIX))
    );
  } catch {
    return false; /* not an absolute URL */
  }
}

/** A non-servable (or missing) venue image falls back to the default photo —
 *  the read-path guard for records stored before validation existed. */
export function sanitizeVenueImage(src: string | undefined): string {
  const url = (src ?? "").trim();
  return isServableVenueImage(url) ? url : DEFAULT_VENUE_IMAGE;
}

/** A venue's full photo list — cover first, deduped, never empty (falls back
 *  to the single `image`, then the default photo). */
export function venueImages(venue: {
  image?: string;
  images?: string[];
}): string[] {
  const all = [venue.image, ...(venue.images ?? [])]
    .map((s) => (s ?? "").trim())
    .filter((s) => isServableVenueImage(s));
  const unique = [...new Set(all)];
  return unique.length ? unique : [DEFAULT_VENUE_IMAGE];
}

/** Parse a display price like "₹1,20,000" or "₹85,000" → 120000 / 85000. */
export function parseVenuePrice(priceFrom: string): number {
  const digits = (priceFrom || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

/** Format a numeric fee back into the "₹85,000" display style. */
export function formatVenuePrice(amount: number): string {
  return money(amount);
}

/** A URL/id-safe slug from a venue name, e.g. "Royal Palace" → "royal-palace". */
export function venueSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "venue"
  );
}

/** City id → display name (falls back to the id for unknown cities). */
export function venueCityName(id: string): string {
  return cities.find((c) => c.id === id)?.name ?? id;
}

/** City id → Hindi display name (falls back to the English name / id). */
export function venueCityNameHi(id: string): string {
  const c = cities.find((c) => c.id === id);
  return c?.nameHi ?? c?.name ?? id;
}

/** Hindi labels for the fixed venue-type vocabulary, keyed by English value. */
export const VENUE_TYPE_HI: Record<string, string> = {
  "Banquet Hall": "बैंक्वेट हॉल",
  "Open Lawn": "खुला लॉन",
  "Convention Center": "कन्वेंशन सेंटर",
  "Hotel Ballroom": "होटल बॉलरूम",
  Resort: "रिज़ॉर्ट",
  "Heritage Venue": "हेरिटेज वेन्यू",
};

/** Localised venue-type label — the English value stays the source of truth. */
export function venueTypeLabel(type: string, lang: "en" | "hi"): string {
  return lang === "hi" ? (VENUE_TYPE_HI[type] ?? type) : type;
}

/**
 * A bookable space within a venue. The same venue offers more than one — an
 * indoor banquet hall AND an open lawn (both bookable & priced), plus guest
 * rooms offered per-room, `subject` to availability rather than booked online.
 */
export interface VenueSpaceOption {
  key: VenueSpaceKey;
  en: string;
  hi: string;
  icon: string;
  /** Booking fee for the space in ₹ (a per-room nightly rate for guest rooms). */
  price: number;
  /** Offered on request, subject to availability (guest rooms) — not a hall the
   *  customer commits to and pays for online. */
  subject?: boolean;
}

/** Everything about a space category except its price — the fixed vocabulary
 *  the owner form offers and the customer surfaces label from. Order here is
 *  display order everywhere. */
export const VENUE_SPACE_CATALOG: Omit<VenueSpaceOption, "price">[] = [
  { key: "banquet", en: "Banquet Hall", hi: "बैंक्वेट हॉल", icon: "🏛️" },
  { key: "lawn", en: "Open Lawn", hi: "खुला लॉन", icon: "🌿" },
  { key: "terrace", en: "Rooftop / Terrace", hi: "रूफ़टॉप / छत", icon: "🌇" },
  { key: "conference", en: "Conference Hall", hi: "कॉन्फ़्रेंस हॉल", icon: "🏢" },
  { key: "rooms", en: "Guest Rooms", hi: "अतिथि कक्ष", icon: "🛏️", subject: true },
];

export function isVenueSpaceKey(v: unknown): v is VenueSpaceKey {
  return VENUE_SPACE_CATALOG.some((c) => c.key === v);
}

/** Open lawns run ~20% larger than the indoor hall; guest rooms cost ~5% of the
 *  hall fee per room / night. Derived from the venue's headline fee so every
 *  venue — seed or owner-listed — gets sensible per-space pricing for free. */
export const VENUE_LAWN_PREMIUM = 1.2;
export const VENUE_ROOM_RATE = 0.05;

/**
 * The spaces a venue offers. When the owner set them explicitly (`spaces` on
 * the record), those categories + prices are the truth. Otherwise — seed and
 * legacy venues — the classic trio is derived from the headline fee: a banquet
 * hall (the "from" price), an open lawn (a step up), and guest rooms (per
 * room, subject to availability).
 */
export function venueSpaceOptions(
  venue: Venue & { price?: number; spaces?: VenueSpacePrice[] },
): VenueSpaceOption[] {
  if (venue.spaces?.length) {
    // Catalog order, not submission order, so surfaces stay consistent.
    return VENUE_SPACE_CATALOG.flatMap((c) => {
      const set = venue.spaces!.find((s) => s.key === c.key);
      return set && set.price > 0 ? [{ ...c, price: set.price }] : [];
    });
  }
  const base =
    typeof venue.price === "number" && venue.price > 0
      ? venue.price
      : parseVenuePrice(venue.priceFrom);
  const rooms = Math.max(2000, Math.round((base * VENUE_ROOM_RATE) / 500) * 500);
  return [
    { key: "banquet", en: "Banquet Hall", hi: "बैंक्वेट हॉल", icon: "🏛️", price: base },
    {
      key: "lawn",
      en: "Open Lawn",
      hi: "खुला लॉन",
      icon: "🌿",
      price: Math.round(base * VENUE_LAWN_PREMIUM),
    },
    { key: "rooms", en: "Guest Rooms", hi: "अतिथि कक्ष", icon: "🛏️", price: rooms, subject: true },
  ];
}

/** The spaces a customer selects & pays for online (banquet hall, open lawn) —
 *  everything except the on-request guest rooms. */
export function bookableSpaces(
  venue: Venue & { price?: number },
): VenueSpaceOption[] {
  return venueSpaceOptions(venue).filter((s) => !s.subject);
}

/** "a, b और c" / "a, b and c" list joiner for the generated copy. */
function listJoin(items: string[], lang: "en" | "hi"): string {
  if (items.length <= 1) return items[0] ?? "";
  const sep = lang === "hi" ? " और " : " and ";
  return items.slice(0, -1).join(", ") + sep + items[items.length - 1];
}

/**
 * A readable, bilingual venue description generated from the venue's own fields
 * (type, locality, city, capacity, offered spaces). Every venue — seed or
 * owner-listed — gets sensible copy without hand-writing a description per
 * venue. Owner-set spaces drive the "offers" clause; legacy/seed venues keep
 * the classic lawn + hall + rooms line.
 */
export function venueDescription(
  venue: Venue & { spaces?: VenueSpacePrice[] },
  lang: "en" | "hi",
): string {
  const type = venueTypeLabel(venue.type, lang).toLowerCase();
  const locality = venue.location ? `${venue.location}, ` : "";
  const explicit = venue.spaces?.length ? venueSpaceOptions(venue) : null;
  if (lang === "hi") {
    const cap = venue.capacity
      ? `, जिसमें ${venue.capacity.replace(/Guests/gi, "मेहमान")} की क्षमता है`
      : "";
    const offers = explicit
      ? `यहाँ ${listJoin(
          explicit.map((s) => (s.subject ? `(उपलब्धता अनुसार) ${s.hi}` : s.hi)),
          "hi",
        )} उपलब्ध हैं`
      : "यहाँ खुला लॉन, वातानुकूलित बैंक्वेट हॉल और (उपलब्धता अनुसार) अतिथि कक्ष उपलब्ध हैं";
    return `${venue.name}, ${locality}${venueCityNameHi(venue.city)} में एक ${type} है${cap}। ${offers} — शादी, रिसेप्शन और पारिवारिक आयोजनों के लिए उपयुक्त।`;
  }
  const article = /^[aeiou]/i.test(type) ? "an" : "a";
  const cap = venue.capacity
    ? ` with room for ${venue.capacity.replace(/Guests/gi, "guests")}`
    : "";
  const offers = explicit
    ? `It offers ${listJoin(
        explicit.map((s) => {
          if (s.key === "rooms") return "guest rooms on request";
          const n = s.en.toLowerCase();
          return `${/^[aeiou]/.test(n) ? "an" : "a"} ${n}`;
        }),
        "en",
      )}`
    : "It offers a landscaped open lawn, an air-conditioned banquet hall and guest rooms on request";
  return `${venue.name} is ${article} ${type} in ${locality}${venueCityName(venue.city)}${cap}. ${offers} — a versatile setting for weddings, receptions and family celebrations.`;
}

/** Make any seed/record venue bookable — derive the numeric fee when absent. */
export function toBookable(
  v: Venue & Partial<Pick<BookableVenue, "price" | "ownerCode" | "ownerName" | "phone" | "registered">>,
): BookableVenue {
  return {
    ...v,
    price: typeof v.price === "number" && v.price > 0 ? v.price : parseVenuePrice(v.priceFrom),
  };
}

/** The static seed catalogue, made bookable. */
export const staticBookableVenues: BookableVenue[] = staticVenues.map((v) => toBookable(v));

/** Turn an owner record into a bookable venue, tagged as registered. */
export function recordToBookable(r: VenueRecord): BookableVenue {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    location: r.location,
    type: r.type,
    capacity: r.capacity,
    priceFrom: r.priceFrom || formatVenuePrice(r.price),
    rating: r.rating,
    reviews: r.reviews,
    image: r.image,
    images: r.images,
    spaces: r.spaces,
    price: r.price,
    ownerCode: r.ownerCode,
    ownerName: r.ownerName,
    phone: r.phone,
    registered: true,
  };
}

/** A venue is visible to customers when its owner hasn't deleted it and an admin
 *  has approved it. Legacy records (no `status`) predate approvals and stay live
 *  so nothing already published disappears. */
export function isVenuePublic(v: VenueRecord): boolean {
  return !v.deleted && v.status !== "Pending" && v.status !== "Hidden";
}

/** Merge registered venues ahead of the static seed, de-duped by id. */
export function mergeVenues(registered: BookableVenue[]): BookableVenue[] {
  const seen = new Set(registered.map((v) => v.id));
  return [...registered, ...staticBookableVenues.filter((v) => !seen.has(v.id))];
}

/* ── Client fetchers ──────────────────────────────────────────────────────
 * Owner-registered venues live behind /api/venues; the seed catalogue ships in
 * the bundle. These helpers fetch the registered set and combine the two. */

/** Fetch every owner-registered venue (empty on any failure — seed still shows). */
export async function fetchRegisteredVenues(): Promise<BookableVenue[]> {
  try {
    const res = await fetch("/api/venues");
    if (!res.ok) return [];
    const data = (await res.json()) as { venues?: VenueRecord[] };
    return (data.venues ?? []).map(recordToBookable);
  } catch {
    return [];
  }
}

/** Fetch the full bookable catalogue (registered + seed), registered first. */
export async function fetchAllVenues(): Promise<BookableVenue[]> {
  return mergeVenues(await fetchRegisteredVenues());
}

/** Resolve one venue by id — checks the registered store, then the seed. */
export async function fetchVenueById(id: string): Promise<BookableVenue | null> {
  const fromSeed = staticBookableVenues.find((v) => v.id === id);
  try {
    const res = await fetch(`/api/venues?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = (await res.json()) as { venue?: VenueRecord | null };
      if (data.venue) return recordToBookable(data.venue);
    }
  } catch {
    /* offline — fall back to the seed */
  }
  return fromSeed ?? null;
}
