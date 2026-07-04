import path from "path";
import {
  parseVenuePrice,
  formatVenuePrice,
  venueSlug,
  type VenueRecord,
} from "@/lib/venues";
import { createStore } from "@/lib/store";

// Owner-registered venues are written at publish time to Postgres (Neon) so the
// venue catalogue, the booking flow and the owner's dashboard can read them —
// never prerender or cache this.
export const dynamic = "force-dynamic";

const store = createStore<VenueRecord>({
  table: "venues",
  file: path.join(process.cwd(), "data", "venues.json"),
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
  const venues = await store.list();

  if (id) {
    const venue = venues.find((v) => v.id === id) ?? null;
    return Response.json({ venue });
  }
  if (owner) {
    return Response.json({
      venues: venues.filter((v) => v.ownerCode === owner).reverse(),
    });
  }
  return Response.json({ venues: venues.slice().reverse() });
}

export async function POST(request: Request) {
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

  const name = str(b.name);
  if (!name) {
    return Response.json({ error: "Venue name is required." }, { status: 400 });
  }
  const city = str(b.city);
  if (!city) {
    return Response.json({ error: "City is required." }, { status: 400 });
  }

  // Numeric fee from an explicit `price`, otherwise parsed from a display
  // `priceFrom` string. We keep both: a number for booking maths and a
  // formatted string for the catalogue card.
  const rawPrice =
    typeof b.price === "number"
      ? b.price
      : parseVenuePrice(str(b.price) ?? str(b.priceFrom) ?? "");
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : 0;
  if (price <= 0) {
    return Response.json({ error: "A valid starting price is required." }, { status: 400 });
  }

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
  // Only the owning partner may edit an existing venue.
  if (existing && existing.ownerCode !== ownerCode) {
    return Response.json({ error: "This venue belongs to another owner." }, { status: 403 });
  }

  const record: VenueRecord = {
    id,
    name,
    city,
    location: str(b.location) ?? "",
    type: str(b.type) ?? "Banquet Hall",
    capacity: str(b.capacity) ?? "",
    priceFrom: str(b.priceFrom) ?? formatVenuePrice(price),
    price,
    rating: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : 4.5,
    reviews: Number.isFinite(reviewsRaw) && reviewsRaw > 0 ? Math.round(reviewsRaw) : 0,
    image:
      str(b.image) ??
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=70",
    ownerCode,
    ownerName: str(b.ownerName),
    phone: str(b.phone),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
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

  return Response.json({ ok: true, venue: record }, { status: existing ? 200 : 201 });
}
