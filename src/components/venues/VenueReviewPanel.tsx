"use client";

/**
 * "Rate this venue" — lets a signed-in customer who has booked this venue leave a
 * star rating + note straight from its detail page, without going through My
 * Bookings.
 *
 * Unlike caterers (booked against per-course specialists in the wizard, so
 * there's no reliable "did they book *this* caterer" link), a venue order stores
 * the venue's own catalogue identity (`vendors: [{ id, name }]`, see
 * `VenueDetail`). So eligibility here is strict and honest: the panel appears
 * only for a completed booking that actually names this venue (by id, or by
 * name-slug for legacy orders placed before the identity was carried).
 *
 * The submission is the exact shape My Bookings / the vendor panel post, keyed by
 * this venue's id, so it lands in the shared reviews store — surfacing in the
 * venue's reviews list, feeding its rating aggregate and (like every review)
 * eligible for the home testimonials ribbon. It's also mirrored onto the stored
 * booking so a return visit prefills for an in-place edit.
 *
 * Write-once: it steps aside the instant a review exists for this venue — the
 * review then shows in the list below as the author's own editable `ReviewCard`.
 */
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import {
  fetchMyBookings,
  onStoredBookingsChange,
  bookingVendors,
  slugifyName,
  type StoredBooking,
} from "@/lib/bookings";
import { saveVendorReview } from "@/lib/reviews";
import type { BookableVenue } from "@/lib/venues";
import StarInput from "@/components/reviews/StarInput";
import { ReviewPhotoEditor } from "@/components/reviews/ReviewPhotos";

/** True when a completed order is for this venue (by catalogue id or name). */
function bookingHasVenue(b: StoredBooking, venue: BookableVenue): boolean {
  const slug = slugifyName(venue.name);
  return bookingVendors(b).some(
    (v) => (v.id && v.id === venue.id) || slugifyName(v.name) === slug,
  );
}

export default function VenueReviewPanel({
  venue,
  onReviewed,
}: {
  venue: BookableVenue;
  /** Refresh the detail page's reviews list + rating after a successful submit. */
  onReviewed: () => void;
}) {
  const { t } = useLang();
  const session = useSession();

  // The customer's own bookings (from the API) — kept live so completing a venue
  // order elsewhere unlocks this panel without a reload.
  const [bookings, setBookings] = useState<StoredBooking[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void fetchMyBookings().then((list) => {
        if (active) setBookings(list);
      });
    };
    load();
    const unsub = onStoredBookingsChange(load);
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // The order this review hangs off: a completed booking for this venue.
  const target = useMemo(
    () =>
      bookings.find(
        (b) => b.status === "Completed" && bookingHasVenue(b, venue),
      ) ?? null,
    [bookings, venue],
  );

  // Any rating already left for this venue on that order (prefill / edit).
  const existing = useMemo(() => {
    const slug = slugifyName(venue.name);
    return (
      target?.reviews?.find(
        (r) => r.vendorId === venue.id || slugifyName(r.vendorName) === slug,
      ) ?? null
    );
  }, [target, venue]);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");
  // Hides the panel the instant a first review is saved, before the reloaded
  // booking (with its mirrored review) makes `existing` truthy on its own.
  const [submitted, setSubmitted] = useState(false);

  // Prefill the reviewer name from the session once it's available, unless the
  // customer has already typed one.
  const [nameSeeded, setNameSeeded] = useState(false);
  if (!nameSeeded && session?.name) {
    setNameSeeded(true);
    setName((prev) => prev || session.name || "");
  }

  // Write-once CTA: show only for a signed-in customer with a completed order for
  // this venue who hasn't reviewed it yet. Once a review exists it lives in the
  // list below as an editable card (`ReviewCard`), so the panel steps aside.
  if (session?.type !== "customer" || !target || existing || submitted) {
    return null;
  }

  const submit = async () => {
    if (status === "submitting") return;
    if (rating < 1) {
      setError(
        t("Please choose a star rating.", "कृपया एक स्टार रेटिंग चुनें।"),
      );
      return;
    }
    setStatus("submitting");
    setError("");
    const result = await saveVendorReview({
      booking: target,
      vendorId: venue.id,
      vendorName: venue.name,
      name,
      rating,
      comment,
      images,
    });
    setStatus("idle");
    if (!result.ok) {
      setError(
        result.error ??
          t(
            "Something went wrong. Please try again.",
            "कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।",
          ),
      );
      return;
    }
    setSubmitted(true);
    onReviewed();
  };

  const fieldCls =
    "mt-1 w-full rounded-lg border border-cream-3 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon";
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  return (
    <div className="mt-6 rounded-2xl border border-maroon/20 bg-cream/40 p-5 sm:p-6">
      <p className="font-display text-lg text-ink">
        {t("Rate this venue", "इस वेन्यू को रेट करें")}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "You've booked this venue with Bhojpatra — share your experience to help other hosts.",
          "आपने Bhojpatra के साथ यह वेन्यू बुक किया है — अन्य मेज़बानों की मदद के लिए अपना अनुभव साझा करें।",
        )}
      </p>

      <div className="mt-4">
        <StarInput
          value={rating}
          onChange={setRating}
          label={(n) =>
            t(
              `${n} out of 5 stars for ${venue.name}`,
              `${venue.name} के लिए 5 में से ${n} स्टार`,
            )
          }
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder={t("Add a note (optional)", "एक नोट जोड़ें (वैकल्पिक)")}
        className={fieldCls + " mt-4 resize-none"}
      />

      <label className="mt-4 block">
        <span className={labelCls}>{t("Your name", "आपका नाम")}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g. Priya S.", "उदा. प्रिया एस.")}
          className={fieldCls}
        />
      </label>

      <div className="mt-4">
        <ReviewPhotoEditor images={images} onChange={setImages} />
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        {t(
          "Your review may appear publicly on this venue and our home page.",
          "आपकी समीक्षा इस वेन्यू और हमारे होम पेज पर सार्वजनिक रूप से दिख सकती है।",
        )}
      </p>

      {error && <p className="mt-3 text-sm font-medium text-maroon">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status === "submitting"}
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
        >
          {status === "submitting"
            ? t("Submitting…", "सबमिट हो रहा है…")
            : t("Submit review", "समीक्षा सबमिट करें")}
        </button>
      </div>
    </div>
  );
}
