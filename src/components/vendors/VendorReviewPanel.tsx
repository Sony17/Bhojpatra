"use client";

/**
 * "Rate this caterer" — lets a signed-in customer who has completed a booking
 * leave a star rating + note for a caterer straight from its profile page,
 * without going through My Bookings.
 *
 * Eligibility mirrors what the data model can actually support. Bookings are
 * placed against per-course specialists in the wizard, not against a `/vendors`
 * catalogue caterer, so there's no reliable "did they book *this* caterer" link.
 * Instead we treat any customer with a completed booking as a verified reviewer
 * and attach the review to their most relevant completed order (one that
 * mentions this caterer if we can find it, else their most recent one) for the
 * booking id + occasion/city context the reviews store expects.
 *
 * The submission is the same shape My Bookings posts, keyed by this listing's
 * id, so the review shows up in the profile's reviews list and feeds the vendor
 * rating aggregate. It's also mirrored onto the stored booking so a second
 * visit prefills for an in-place edit.
 *
 * This panel is write-once: it appears only until the customer has left a
 * review for this caterer. After that it steps aside — the review then shows in
 * the list below as the author's own editable card (see `ReviewCard`).
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
import type { VendorListing } from "@/lib/data";
import StarInput from "@/components/reviews/StarInput";
import { ReviewPhotoEditor } from "@/components/reviews/ReviewPhotos";
import { Button } from "@/components/ui";

/** True when a completed order lists this caterer (by catalogue id or name). */
function bookingHasVendor(b: StoredBooking, vendor: VendorListing): boolean {
  const slug = slugifyName(vendor.name);
  return bookingVendors(b).some(
    (v) => (v.id && v.id === vendor.id) || slugifyName(v.name) === slug,
  );
}

export default function VendorReviewPanel({
  vendor,
  onReviewed,
}: {
  vendor: VendorListing;
  /** Refresh the profile's reviews list + rating after a successful submit. */
  onReviewed: () => void;
}) {
  const { t } = useLang();
  const session = useSession();

  // The customer's own bookings (from the API) — kept live so completing an
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

  // The order this review hangs off: prefer a completed one that names this
  // caterer, else the most recent completed order (list is newest-first).
  const target = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "Completed");
    return completed.find((b) => bookingHasVendor(b, vendor)) ?? completed[0] ?? null;
  }, [bookings, vendor]);

  // Any rating already left for this caterer on that order (prefill / edit).
  const existing = useMemo(() => {
    const slug = slugifyName(vendor.name);
    return (
      target?.reviews?.find(
        (r) => r.vendorId === vendor.id || slugifyName(r.vendorName) === slug,
      ) ?? null
    );
  }, [target, vendor]);

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

  // Write-once CTA: show only for a signed-in customer with a completed order
  // who hasn't reviewed this caterer yet. Once a review exists it lives in the
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
      vendorId: vendor.id,
      vendorName: vendor.name,
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
    "mt-1 w-full rounded-control border border-cream-3 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon";
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  return (
    <div className="mt-6 rounded-card border border-maroon/20 bg-cream/40 p-5 sm:p-6">
      <p className="font-display text-lg text-ink">
        {t("Rate this caterer", "इस कैटरर को रेट करें")}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "You've booked with Bhojpatra — share your experience to help other hosts.",
          "आपने Bhojpatra के साथ बुकिंग की है — अन्य मेज़बानों की मदद के लिए अपना अनुभव साझा करें।",
        )}
      </p>

      <div className="mt-4">
        <StarInput
          value={rating}
          onChange={setRating}
          label={(n) =>
            t(
              `${n} out of 5 stars for ${vendor.name}`,
              `${vendor.name} के लिए 5 में से ${n} स्टार`,
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
          "Your review may appear publicly on this profile and our home page.",
          "आपकी समीक्षा इस प्रोफ़ाइल और हमारे होम पेज पर सार्वजनिक रूप से दिख सकती है।",
        )}
      </p>

      {error && <p className="mt-3 text-sm font-medium text-maroon">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={submit}
          disabled={status === "submitting"}
        >
          {status === "submitting"
            ? t("Submitting…", "सबमिट हो रहा है…")
            : t("Submit review", "समीक्षा सबमिट करें")}
        </Button>
      </div>
    </div>
  );
}
