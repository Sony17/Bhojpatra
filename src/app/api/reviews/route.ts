import { createStore } from "@/lib/store";

// Reviews are written at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export interface StoredReview {
  /** `${bookingId}:${vendorKey}` — one review per vendor per booking. Unique id
   *  so re-submitting a rating for the same vendor edits in place. */
  id: string;
  /** The booking this review is for. */
  bookingId: string;
  /** Catalogue id of the rated vendor. Empty for legacy whole-order reviews or
   *  orders that only kept vendor names. */
  vendorId: string;
  /** Display name of the rated vendor / specialist. */
  vendor: string;
  /** Reviewer display name (prefilled from the booking, editable). */
  name: string;
  occasion: string;
  city: string;
  /** 1–5 stars. */
  rating: number;
  comment: string;
  /** Same-origin serving URLs (`/api/reviews/photo/[id]`) of photos the
   *  reviewer attached (capped). */
  images?: string[];
  createdAt: string;
}

// Keyed by the composite `id` (bookingId + vendor) — one review per vendor per
// booking; re-submitting updates in place.
const store = createStore<StoredReview>({
  table: "reviews",
  idField: "id",
});

/** Longest comment we'll store — keeps a stray paste from bloating the row. */
const COMMENT_MAX = 600;

/** Most photos a reviewer can attach to one vendor rating. */
const IMAGES_MAX = 4;

/** Keep only our own uploaded photo URLs, capped. Photos are served from the
 *  same-origin `GET /api/reviews/photo/[id]` route, so a valid entry is exactly
 *  that path. Guards the store from arbitrary external URLs being smuggled into
 *  a review. */
function toImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is string =>
        typeof v === "string" &&
        /^\/api\/reviews\/photo\/[A-Za-z0-9-]+$/.test(v),
    )
    .slice(0, IMAGES_MAX);
}

/** Trim an unknown value to a string, or "" when it isn't one. */
function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Lowercase, hyphenated slug — the fallback key when a review has no vendorId. */
function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** One rating in a submission, before validation. */
interface ReviewInput {
  vendorId?: unknown;
  vendor?: unknown;
  rating?: unknown;
  comment?: unknown;
  images?: unknown;
}

/** Validate + normalise a single vendor rating into a StoredReview, or return a
 *  string describing why it was rejected. Shared context (booking, reviewer) is
 *  passed in so batch and legacy submissions build identical rows. */
function buildReview(
  input: ReviewInput,
  ctx: { bookingId: string; name: string; occasion: string; city: string },
): StoredReview | string {
  const ratingNum = Number(input.rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return "Please choose a rating between 1 and 5 stars.";
  }
  const vendorId = str(input.vendorId);
  const vendor = str(input.vendor) || "Bhojpatra";
  const key = vendorId || slug(vendor) || "order";
  return {
    id: `${ctx.bookingId}:${key}`,
    bookingId: ctx.bookingId,
    vendorId,
    vendor,
    name: ctx.name || "Guest",
    occasion: ctx.occasion,
    city: ctx.city,
    rating: ratingNum,
    comment: str(input.comment).slice(0, COMMENT_MAX),
    images: toImages(input.images),
    createdAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const bookingId = str(b.bookingId);
  if (!bookingId) {
    return Response.json(
      { error: "A booking is required to leave a review." },
      { status: 400 },
    );
  }

  const ctx = {
    bookingId,
    name: str(b.name),
    occasion: str(b.occasion),
    city: str(b.city),
  };

  // Batch (per-vendor) submission when `reviews` is an array; otherwise treat the
  // body itself as a single rating (legacy / whole-order form).
  const rawList: ReviewInput[] = Array.isArray(b.reviews)
    ? (b.reviews as ReviewInput[])
    : [b as ReviewInput];

  if (rawList.length === 0) {
    return Response.json(
      { error: "Please rate at least one vendor." },
      { status: 400 },
    );
  }

  const reviews: StoredReview[] = [];
  for (const input of rawList) {
    const built = buildReview(input, ctx);
    if (typeof built === "string") {
      return Response.json({ error: built }, { status: 400 });
    }
    reviews.push(built);
  }

  try {
    await store.upsertMany(reviews);
  } catch (err) {
    console.error("Failed to persist review", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, reviews }, { status: 201 });
}

// The home testimonials feed reads published reviews here, newest first.
export async function GET() {
  const reviews = await store.list();
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ reviews });
}
