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

/** Booking fee → 18% GST, with a 10% advance to lock the date (matches the
 *  catering wizard's conventions). */
export const VENUE_GST_RATE = 0.18;
export const VENUE_ADVANCE_RATE = 0.1;

/** The fixed venue-type vocabulary used across the seed catalogue + filters. */
export const VENUE_TYPES = [
  "Banquet Hall",
  "Open Lawn",
  "Convention Center",
  "Hotel Ballroom",
  "Resort",
  "Heritage Venue",
] as const;

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
  /** Referral code of the Venue-Owner partner who published this venue. */
  ownerCode: string;
  ownerName?: string;
  phone?: string;
  createdAt: string;
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
  ownerCode?: string;
  ownerName?: string;
  phone?: string;
  registered?: boolean;
}

/** Fallback venue photo used when an owner submits no (or an unusable) image URL. */
export const DEFAULT_VENUE_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=70";

/**
 * Restrict venue images to sources `next/image` can actually serve: local
 * `/public` paths and the remote hosts whitelisted under
 * `images.remotePatterns` in next.config.ts. Owners paste things like an
 * unsplash.com *page* link (not an image file), which would crash every card
 * that renders it — those fall back to the default photo instead.
 */
export function sanitizeVenueImage(src: string | undefined): string {
  const url = (src ?? "").trim();
  if (url.startsWith("/")) return url;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === "https:" && hostname === "images.unsplash.com") return url;
  } catch {
    /* not an absolute URL — fall through to the default */
  }
  return DEFAULT_VENUE_IMAGE;
}

/** Parse a display price like "₹1,20,000" or "₹85,000" → 120000 / 85000. */
export function parseVenuePrice(priceFrom: string): number {
  const digits = (priceFrom || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

/** Format a numeric fee back into the "₹85,000" display style. */
const inr = new Intl.NumberFormat("en-IN");
export function formatVenuePrice(amount: number): string {
  return `₹${inr.format(Math.round(amount))}`;
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
    price: r.price,
    ownerCode: r.ownerCode,
    ownerName: r.ownerName,
    phone: r.phone,
    registered: true,
  };
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
