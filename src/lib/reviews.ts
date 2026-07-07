/**
 * Client-side write path for a single vendor rating.
 *
 * Shared by the vendor page's "rate this caterer" panel (a customer's *first*
 * review for a caterer) and the inline editable review card (in-place edits) so
 * both POST an identical row to `/api/reviews` and keep the booking's `reviews`
 * mirror in sync for prefill on a return visit.
 */

import {
  patchMyBooking,
  slugifyName,
  type StoredBooking,
  type BookingVendorReview,
} from "@/lib/bookings";

export interface SaveVendorReviewInput {
  /** The completed order this review hangs off — supplies the booking id,
   *  occasion/city context and the reviews array to mirror the rating back onto. */
  booking: StoredBooking;
  /** Catalogue id of the rated caterer ("" for legacy / name-only vendors). */
  vendorId: string;
  /** Display name of the rated caterer. */
  vendorName: string;
  /** Reviewer display name (prefilled from the session, editable). */
  name: string;
  rating: number;
  comment: string;
  /** Public URLs of photos the reviewer attached (already uploaded). */
  images?: string[];
}

/** Carries the server's error message (if any) so the caller can surface a
 *  localised fallback. */
export type SaveVendorReviewResult = { ok: true } | { ok: false; error?: string };

export async function saveVendorReview(
  input: SaveVendorReviewInput,
): Promise<SaveVendorReviewResult> {
  const { booking, vendorId, vendorName, name, rating, comment } = input;
  const trimmedComment = comment.trim();
  const images = input.images ?? [];

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: booking.id,
        name: name.trim(),
        occasion: booking.occasion,
        city: booking.city,
        reviews: [
          { vendorId, vendor: vendorName, rating, comment: trimmedComment, images },
        ],
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error };
    }
  } catch {
    return { ok: false };
  }

  // Mirror onto the stored booking so My Bookings / a return visit prefill for
  // an in-place edit. Best-effort — the review itself is already persisted.
  const slug = slugifyName(vendorName);
  const kept = (booking.reviews ?? []).filter((r) => {
    const sameId = vendorId && r.vendorId === vendorId;
    const sameName = slugifyName(r.vendorName) === slug;
    return !(sameId || sameName);
  });
  const mirrored: BookingVendorReview = {
    vendorId,
    vendorName,
    rating,
    comment: trimmedComment,
    images,
    createdAt: new Date().toISOString(),
  };
  await patchMyBooking(booking.id, { reviews: [...kept, mirrored] });

  return { ok: true };
}
