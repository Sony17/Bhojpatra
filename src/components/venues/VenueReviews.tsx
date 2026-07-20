"use client";

/**
 * "Ratings & reviews" section for a venue detail page — the venue-side twin of
 * the caterer profile's reviews block (`VendorDetail`).
 *
 * Venue orders flow through the same bookings + reviews pipeline as caterers, so
 * this reads the shared `GET /api/reviews`, keeps only reviews for this venue
 * (by catalogue id, or name-slug for legacy orders) and renders them with the
 * same on-brand pieces (`Stars`, `ReviewCard`). A signed-in customer who has
 * completed a booking for this venue can rate it inline via `VenueReviewPanel`;
 * the author can edit their own card in place. The headline score is computed
 * live from the loaded list so a fresh rating shows immediately, falling back to
 * the shared aggregate and finally the seed number.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import {
  slugifyName,
  fetchMyBookings,
  onStoredBookingsChange,
  type StoredBooking,
} from "@/lib/bookings";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import type { BookableVenue } from "@/lib/venues";
import { Stars, StarIcon } from "@/components/reviews/reviewDisplay";
import ReviewCard from "@/components/vendors/ReviewCard";
import VenueReviewPanel from "@/components/venues/VenueReviewPanel";
import { Card } from "@/components/ui";

/** One customer review as returned by `GET /api/reviews`. */
interface StoredReview {
  bookingId: string;
  vendorId: string;
  vendor: string;
  name: string;
  occasion: string;
  city: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

/** A small cream disc with a red check — the trust marker in the summary. */
function CheckBadge() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3 text-maroon"
        aria-hidden="true"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

export default function VenueReviews({ venue }: { venue: BookableVenue }) {
  const { t } = useLang();
  const session = useSession();

  const ratings = useVendorRatings();
  const stats = statFor(ratings, venue);

  // Real, customer-submitted reviews for this venue. Best-effort — falls back to
  // an empty list on any failure. A callback so the panel can re-pull after a
  // fresh submit.
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const loadReviews = useCallback(() => {
    const slug = slugifyName(venue.name);
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews?: StoredReview[] } | null) => {
        if (!d?.reviews) return;
        setReviews(
          d.reviews.filter(
            (r) =>
              (r.vendorId && r.vendorId === venue.id) ||
              slugifyName(r.vendor ?? "") === slug,
          ),
        );
      })
      .catch(() => {});
  }, [venue.id, venue.name]);
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // The signed-in customer's own orders — so a review whose booking id matches
  // one of these is theirs and editable inline.
  const [myBookings, setMyBookings] = useState<StoredBooking[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void fetchMyBookings().then((list) => {
        if (active) setMyBookings(list);
      });
    };
    load();
    const unsub = onStoredBookingsChange(load);
    return () => {
      active = false;
      unsub();
    };
  }, []);
  const myBookingById = useMemo(
    () => new Map(myBookings.map((b) => [b.id, b] as const)),
    [myBookings],
  );

  // A live aggregate from the reviews just loaded, so a rating submitted from the
  // panel below is reflected immediately (the shared summary fetches once).
  const liveStat = reviews.length
    ? {
        rating:
          Math.round(
            (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) *
              10,
          ) / 10,
        count: reviews.length,
      }
    : undefined;
  // Prefer the live count, then the shared aggregate, then the static seed.
  const verified = liveStat ?? stats;
  const shownRating = verified?.rating ?? venue.rating;
  const shownCount = verified?.count ?? venue.reviews;

  // Star breakdown for the summary, built from the written reviews we loaded.
  const hasWritten = reviews.length > 0;
  const dist = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // [5★, 4★, 3★, 2★, 1★]
    for (const r of reviews) {
      const s = Math.round(r.rating);
      if (s >= 1 && s <= 5) buckets[5 - s] += 1;
    }
    return buckets;
  }, [reviews]);

  return (
    <div
      id="reviews"
      className="mx-auto mt-14 max-w-6xl scroll-mt-32 border-t border-cream-3 px-5 pt-10"
    >
      <div className="text-center">
        <p className="eyebrow text-xs font-semibold text-maroon">
          {t("Ratings & reviews", "रेटिंग और समीक्षाएँ")}
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
          {t("What guests say", "मेहमान क्या कहते हैं")}
        </h2>
      </div>

      {/* Summary — headline score alongside the star breakdown (or, until written
          reviews land, the reasons the rating can be trusted). */}
      <Card padding="none" className="mt-6 overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,auto)_1fr] md:gap-10">
          <div className="flex flex-col items-center justify-center text-center md:min-w-52 md:border-r md:border-cream-3 md:pr-10">
            <p className="font-display text-6xl leading-none text-ink">
              {shownRating}
              <span className="align-top text-2xl text-ink-soft">/5</span>
            </p>
            <div className="mt-3">
              <Stars
                rating={shownRating}
                size={22}
                label={t(
                  `${shownRating} out of 5 stars`,
                  `5 में से ${shownRating} स्टार`,
                )}
              />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {t(
                `Rated by ${shownCount} ${shownCount === 1 ? "guest" : "guests"}`,
                `${shownCount} मेहमानों द्वारा रेट किया गया`,
              )}
            </p>
          </div>

          {hasWritten ? (
            <ul className="flex flex-col justify-center gap-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = dist[5 - star];
                const pct = reviews.length
                  ? Math.round((count / reviews.length) * 100)
                  : 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-sm">
                    <span className="flex w-11 shrink-0 items-center gap-1 font-medium text-ink">
                      {star}
                      <StarIcon className="h-3.5 w-3.5 text-maroon" />
                    </span>
                    <span
                      className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-2"
                      role="presentation"
                    >
                      <span
                        className="block h-full rounded-full bg-maroon transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-ink-soft">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="flex flex-col justify-center gap-4">
              {[
                t(
                  "Every review comes from a completed Bhojpatra booking.",
                  "हर समीक्षा एक पूर्ण Bhojpatra बुकिंग से आती है।",
                ),
                t(
                  "Real photos from real events — never stock imagery.",
                  "असली आयोजनों की असली तस्वीरें — कभी स्टॉक नहीं।",
                ),
                t(
                  "Nothing paid or incentivised — just honest hosts.",
                  "कोई भुगतान या प्रोत्साहन नहीं — बस ईमानदार मेज़बान।",
                ),
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-ink">
                  <CheckBadge />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Signed-in customers who've completed a booking for this venue can rate it
          right here — mirrors the My Bookings review flow. */}
      <VenueReviewPanel venue={venue} onReviewed={loadReviews} />

      {reviews.length > 0 ? (
        <>
          <h3 className="mt-10 font-display text-lg text-ink">
            {t(
              `${reviews.length} written ${reviews.length === 1 ? "review" : "reviews"}`,
              `${reviews.length} लिखित समीक्षाएँ`,
            )}
          </h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => {
              // The customer can edit a review only when it hangs off one of
              // their own orders (proven by the booking id matching).
              const ownBooking =
                session?.type === "customer"
                  ? myBookingById.get(r.bookingId)
                  : undefined;
              return (
                <ReviewCard
                  key={`${r.bookingId}:${r.vendorId || slugifyName(r.vendor)}`}
                  review={r}
                  editable={
                    ownBooking
                      ? { booking: ownBooking, onSaved: loadReviews }
                      : undefined
                  }
                />
              );
            })}
          </ul>
        </>
      ) : (
        <div className="mt-8 rounded-card border border-dashed border-cream-3 bg-white p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-2">
            <StarIcon className="h-6 w-6 text-maroon" />
          </span>
          <p className="mt-4 font-display text-lg text-ink">
            {t("No written reviews yet", "अभी कोई लिखित समीक्षा नहीं")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            {t(
              "This rating comes from verified bookings. Written reviews from recent guests will show up here.",
              "यह रेटिंग सत्यापित बुकिंग से है। हाल के मेहमानों की लिखित समीक्षाएँ यहाँ दिखेंगी।",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
