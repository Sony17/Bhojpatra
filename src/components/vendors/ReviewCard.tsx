"use client";

/**
 * One customer review on a vendor's profile.
 *
 * Read-only by default. When `editable` is passed — i.e. this review belongs to
 * the signed-in customer (its booking is one of their own) — the card grows an
 * "Edit" affordance that flips it into an inline star + note editor, reusing the
 * same star control and save path as the "rate this caterer" panel.
 */

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { StoredBooking } from "@/lib/bookings";
import { saveVendorReview } from "@/lib/reviews";
import StarInput from "@/components/reviews/StarInput";
import { Stars, formatReviewDate } from "@/components/reviews/reviewDisplay";
import {
  ReviewPhotoEditor,
  ReviewPhotoStrip,
} from "@/components/reviews/ReviewPhotos";

/** The review shape this card renders — a subset of the stored review. */
export interface ReviewCardData {
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

export default function ReviewCard({
  review,
  editable,
}: {
  review: ReviewCardData;
  /** Present only for the signed-in author's own review — enables inline edit.
   *  `booking` is their stored order (for the mirror); `onSaved` re-pulls the
   *  list + rating after a successful edit. */
  editable?: { booking: StoredBooking; onSaved: () => void };
}) {
  const { t } = useLang();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment);
  const [name, setName] = useState(review.name);
  const [images, setImages] = useState<string[]>(review.images ?? []);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

  const context = [review.occasion, review.city].filter(Boolean).join(" · ");
  const date = review.createdAt ? formatReviewDate(review.createdAt) : "";
  const initial = (review.name.trim()[0] || "★").toUpperCase();

  const cardCls =
    "rounded-2xl border bg-white p-5 shadow-sm " +
    (editable ? "border-maroon/30" : "border-cream-3");

  const startEdit = () => {
    setRating(review.rating);
    setComment(review.comment);
    setName(review.name);
    setImages(review.images ?? []);
    setError("");
    setMode("edit");
  };

  const save = async () => {
    if (!editable || status === "submitting") return;
    if (rating < 1) {
      setError(t("Please choose a star rating.", "कृपया एक स्टार रेटिंग चुनें।"));
      return;
    }
    setStatus("submitting");
    setError("");
    const result = await saveVendorReview({
      booking: editable.booking,
      vendorId: review.vendorId,
      vendorName: review.vendor,
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
    setMode("view");
    editable.onSaved();
  };

  // ── Inline editor (author only) ─────────────────────────────────────────
  if (editable && mode === "edit") {
    const fieldCls =
      "mt-1 w-full rounded-lg border border-cream-3 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon";
    const labelCls =
      "text-[11px] font-semibold uppercase tracking-wide text-maroon";
    return (
      <li className="rounded-2xl border border-maroon/30 bg-cream/40 p-5 shadow-sm">
        <p className="font-display text-lg text-ink">
          {t("Edit your review", "अपनी समीक्षा संपादित करें")}
        </p>

        <div className="mt-3">
          <StarInput
            value={rating}
            onChange={setRating}
            label={(n) =>
              t(
                `${n} out of 5 stars for ${review.vendor}`,
                `${review.vendor} के लिए 5 में से ${n} स्टार`,
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

        {error && (
          <p className="mt-3 text-sm font-medium text-maroon">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            disabled={status === "submitting"}
            className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark disabled:opacity-60"
          >
            {status === "submitting"
              ? t("Saving…", "सहेजा जा रहा है…")
              : t("Update review", "समीक्षा अपडेट करें")}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode("view");
            }}
            className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
          >
            {t("Cancel", "रद्द करें")}
          </button>
        </div>
      </li>
    );
  }

  // ── Read-only view (everyone) + edit affordance for the author ──────────
  return (
    <li className={cardCls}>
      <div className="flex items-start gap-3">
        {/* Avatar — reviewer's initial */}
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon font-display text-lg text-cream"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-ink">
              {review.name}
            </span>
            {editable && (
              <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[11px] font-semibold text-maroon">
                {t("You", "आप")}
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Stars
              rating={review.rating}
              size={14}
              label={t(
                `${review.rating} out of 5 stars`,
                `5 में से ${review.rating} स्टार`,
              )}
            />
            {date && <span className="text-xs text-ink-soft">{date}</span>}
          </div>
        </div>
      </div>

      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-ink">{review.comment}</p>
      )}
      <ReviewPhotoStrip images={review.images} />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-maroon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {t("Verified booking", "सत्यापित बुकिंग")}
        </span>
        {context && (
          <>
            <span aria-hidden="true" className="text-ink-soft">
              ·
            </span>
            <span className="text-xs text-ink-soft">{context}</span>
          </>
        )}
        {editable && (
          <button
            type="button"
            onClick={startEdit}
            className="ml-auto rounded-full border border-maroon px-4 py-1.5 text-xs font-semibold text-maroon transition hover:bg-maroon/5"
          >
            {t("Edit", "संपादित करें")}
          </button>
        )}
      </div>
    </li>
  );
}
