import {
  parseVenuePrice,
  formatVenuePrice,
  venueSlug,
  sanitizeVenueImage,
  isServableVenueImage,
  isVenuePublic,
  isVenueSpaceKey,
  clampUnits,
  VENUE_MAX_IMAGES,
  VENUE_MAX_UNITS,
  VENUE_MAX_SPACE_UNITS,
  type VenueRecord,
  type VenueSpacePrice,
} from "@/lib/venues";
import { createStore } from "@/lib/store";
import { sendVenueAlert } from "@/lib/email";
import { getSessionUser, requireRole } from "@/lib/auth";

// Owner-registered venues are written at publish time to Postgres (Neon) so the
// venue catalogue, the booking flow and the owner's dashboard can read them —
// never prerender or cache this.
export const dynamic = "force-dynamic";

type StoredVenue = VenueRecord & { ownerUserId?: string };

const store = createStore<StoredVenue>({
  table: "venues",
  idField: "id",
});

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// Resolve a single venue by ?id=… (used by the venue detail page / booking
// flow), every venue published by ?owner=CODE (the owner's dashboard), or the
// full list (the catalogue merges this with the static seed).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const owner = url.searchParams.get("owner");
  // Sanitize images on the way out too — a previously stored non-servable
  // URL must never reach a `next/image` and crash the page.
  const venues = (await store.list())
    .filter((v) => !v.deleted)
    .map((v) => ({
      ...v,
      image: sanitizeVenueImage(v.image),
      ...(v.images
        ? { images: v.images.filter((s) => isServableVenueImage(s)) }
        : {}),
    }));

  if (id) {
    // The single-venue lookup feeds the public detail page + booking flow, so
    // only ever resolve an approved venue — a pending/hidden one is unbookable.
    const venue = venues.find((v) => v.id === id && isVenuePublic(v)) ?? null;
    return Response.json({ venue });
  }
  if (owner) {
    // The owner's own dashboard sees every venue it published, pending ones
    // included, so it can show each one's approval state. Gated to the owner
    // partner or an admin so unapproved/pending venues are never exposed.
    const user = await getSessionUser();
    if (!user) {
      return Response.json({ error: "Not signed in." }, { status: 401 });
    }
    const isOwnerOrAdmin =
      user.role === "admin" ||
      Boolean(user.partnerRoles?.some((r) => r.referralCode === owner));
    if (!isOwnerOrAdmin) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }
    return Response.json({
      venues: venues.filter((v) => v.ownerCode === owner).reverse(),
    });
  }
  // Public catalogue: approved (and grandfathered legacy) venues only.
  return Response.json({ venues: venues.filter(isVenuePublic).reverse() });
}

export async function POST(request: Request) {
  const guard = await requireRole("partner", "admin");
  if (guard instanceof Response) return guard;
  const isAdmin = guard.role === "admin";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  const ownerCode = str(b.ownerCode);
  if (!ownerCode || !/^REF-/.test(ownerCode)) {
    return Response.json({ error: "Missing venue-owner code." }, { status: 400 });
  }

  // Non-admin partners may only publish or manage venues under their own verified referral code.
  if (!isAdmin) {
    const holdsCode = guard.partnerRoles?.some((r) => r.referralCode === ownerCode);
    if (!holdsCode) {
      return Response.json(
        { error: "You may only manage venues under your own referral code." },
        { status: 403 },
      );
    }
  }

  const name = str(b.name);
  if (!name) {
    return Response.json({ error: "Venue name is required." }, { status: 400 });
  }
  const city = str(b.city);
  if (!city) {
    return Response.json({ error: "City is required." }, { status: 400 });
  }

  // The spaces this venue offers (banquet hall, lawn, …), each with its own
  // owner-set fee. Optional — legacy clients still send a single price.
  let spaces: VenueSpacePrice[] | undefined;
  if (Array.isArray(b.spaces) && b.spaces.length) {
    spaces = [];
    for (const raw of b.spaces) {
      const s = (raw ?? {}) as Record<string, unknown>;
      const spacePrice = Math.round(Number(s.price));
      if (!isVenueSpaceKey(s.key) || !Number.isFinite(spacePrice) || spacePrice <= 0) {
        return Response.json(
          { error: "Each offered space needs a valid price." },
          { status: 400 },
        );
      }
      if (!spaces.some((x) => x.key === s.key)) {
        // How many of this space the venue has (2 lawns, 10 guest rooms). Halls
        // and lawns each become their own selectable card, so they take the
        // tighter cap; rooms are a quantity and take the larger one.
        const units = clampUnits(
          s.units,
          s.key === "rooms" ? VENUE_MAX_UNITS : VENUE_MAX_SPACE_UNITS,
        );
        spaces.push({ key: s.key, price: spacePrice, units });
      }
    }
    // Guest rooms are on-request only — a venue can't be *just* rooms.
    if (!spaces.some((s) => s.key !== "rooms")) {
      return Response.json(
        { error: "Offer at least one bookable space (hall, lawn…) with a price." },
        { status: 400 },
      );
    }
  }

  // Numeric fee: the cheapest bookable space when spaces are set; otherwise an
  // explicit `price` or a parsed display `priceFrom`. We keep both: a number
  // for booking maths and a formatted string for the catalogue card.
  const bookablePrices = (spaces ?? [])
    .filter((s) => s.key !== "rooms")
    .map((s) => s.price);
  const rawPrice = bookablePrices.length
    ? Math.min(...bookablePrices)
    : typeof b.price === "number"
      ? b.price
      : parseVenuePrice(str(b.price) ?? str(b.priceFrom) ?? "");
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : 0;
  if (price <= 0) {
    return Response.json({ error: "A valid starting price is required." }, { status: 400 });
  }

  // Photo links the site can't serve must not be silently swapped for the
  // default — tell the owner so they can fix them (or upload files instead).
  const images = (Array.isArray(b.images) ? b.images : [b.image])
    .map((v) => str(v))
    .filter((v): v is string => Boolean(v));
  for (const img of images) {
    if (!isServableVenueImage(img)) {
      return Response.json(
        {
          error:
            "We can't use that photo link. Paste a direct image address from " +
            "Unsplash (right-click the photo → Copy Image Address), upload " +
            "the photo instead, or leave it blank for the default photo.",
        },
        { status: 400 },
      );
    }
  }
  const gallery = [...new Set(images)].slice(0, VENUE_MAX_IMAGES);

  const ratingRaw = Number(b.rating);
  const reviewsRaw = Number(b.reviews);

  const venues = await store.list();

  // Keep the caller's id when editing; otherwise mint a unique slug from the
  // name so two venues never collide.
  let id = str(b.id) ?? "";
  if (!id) {
    const base = venueSlug(name);
    id = base;
    for (let n = 2; venues.some((v) => v.id === id); n++) id = `${base}-${n}`;
  }

  const existing = venues.find((v) => v.id === id);
  // Only the owning partner or an admin may edit an existing venue.
  if (existing && !isAdmin) {
    const isOwner =
      (existing.ownerUserId && existing.ownerUserId === guard.id) ||
      Boolean(guard.partnerRoles?.some((r) => r.referralCode === existing.ownerCode));
    if (!isOwner) {
      return Response.json({ error: "This venue belongs to another owner." }, { status: 403 });
    }
  }

  const record: StoredVenue = {
    id,
    ownerUserId: existing?.ownerUserId ?? guard.id,
    name,
    city,
    location: str(b.location) ?? "",
    type: str(b.type) ?? "Banquet Hall",
    capacity: str(b.capacity) ?? "",
    // With owner-set spaces the display price must track the derived minimum,
    // not whatever the client formatted.
    priceFrom: spaces
      ? formatVenuePrice(price)
      : (str(b.priceFrom) ?? formatVenuePrice(price)),
    price,
    rating: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : 4.5,
    reviews: Number.isFinite(reviewsRaw) && reviewsRaw > 0 ? Math.round(reviewsRaw) : 0,
    image: sanitizeVenueImage(gallery[0]),
    ...(gallery.length ? { images: gallery } : {}),
    ...(spaces ? { spaces } : {}),
    ownerCode: existing?.ownerCode ?? ownerCode,
    ownerName: str(b.ownerName),
    phone: str(b.phone),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    // A brand-new venue needs admin approval before it lists; an edit keeps the
    // current approval state (an owner can't self-approve or un-hide by saving).
    status: existing ? existing.status : "Pending",
  };

  try {
    await store.upsert(record);
  } catch (err) {
    console.error("Failed to persist venue", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Alert the owners when a venue is first published (skip subsequent edits).
  if (!existing) await sendVenueAlert(record);

  return Response.json({ ok: true, venue: record }, { status: existing ? 200 : 201 });
}
