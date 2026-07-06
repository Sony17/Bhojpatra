import path from "path";
import { createStore } from "@/lib/store";

// Reviews are written at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export interface StoredReview {
  /** The booking this review is for. One review per booking (the id-field). */
  bookingId: string;
  /** The vendor / specialist who catered the event. */
  vendor: string;
  /** Reviewer display name (prefilled from the booking, editable). */
  name: string;
  occasion: string;
  city: string;
  /** 1–5 stars. */
  rating: number;
  comment: string;
  createdAt: string;
}

// Keyed by bookingId — one review per booking; re-submitting updates in place.
const store = createStore<StoredReview>({
  table: "reviews",
  file: path.join(process.cwd(), "data", "reviews.json"),
  idField: "bookingId",
});

/** Longest comment we'll store — keeps a stray paste from bloating the row. */
const COMMENT_MAX = 600;

/** Trim an unknown value to a string, or "" when it isn't one. */
function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, vendor, name, occasion, city, rating, comment } =
    (body ?? {}) as Record<string, unknown>;

  const cleanBookingId = str(bookingId);
  if (!cleanBookingId) {
    return Response.json(
      { error: "A booking is required to leave a review." },
      { status: 400 },
    );
  }

  // Rating must be a whole number of stars, 1–5.
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return Response.json(
      { error: "Please choose a rating between 1 and 5 stars." },
      { status: 400 },
    );
  }

  const cleanComment = str(comment).slice(0, COMMENT_MAX);
  if (!cleanComment) {
    return Response.json(
      { error: "Please write a few words about your experience." },
      { status: 400 },
    );
  }

  const review: StoredReview = {
    bookingId: cleanBookingId,
    vendor: str(vendor) || "Bhojpatra",
    name: str(name) || "Guest",
    occasion: str(occasion),
    city: str(city),
    rating: ratingNum,
    comment: cleanComment,
    createdAt: new Date().toISOString(),
  };

  try {
    await store.upsert(review);
  } catch (err) {
    console.error("Failed to persist review", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, review }, { status: 201 });
}

// The home testimonials feed reads published reviews here, newest first.
export async function GET() {
  const reviews = await store.list();
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ reviews });
}
