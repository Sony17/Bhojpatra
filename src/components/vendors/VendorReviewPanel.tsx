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
 */
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import {
  getStoredBookings,
  onStoredBookingsChange,
  updateStoredBooking,
  bookingVendors,
  slugifyName,
  type StoredBooking,
  type BookingVendorReview,
} from "@/lib/bookings";
import type { VendorListing } from "@/lib/data";
import StarInput from "@/components/reviews/StarInput";

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

  // The customer's own bookings (localStorage) — kept live so completing an
  // order elsewhere unlocks this panel without a reload.
  const [bookings, setBookings] = useState<StoredBooking[]>([]);
  useEffect(() => {
    const load = () => setBookings(getStoredBookings());
    load();
    return onStoredBookingsChange(load);
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
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState("");

  // Seed the editable fields from any existing review whenever the target order
  // first resolves (bookings load async). Adjusting state during render — the
  // pattern React recommends over a setState-in-effect — so the guard runs it
  // exactly once per order, before paint.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (target && target.id !== seededFor) {
    setSeededFor(target.id);
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
    setMode(existing ? "view" : "edit");
  }
  // Prefill the reviewer name from the session once it's available, unless the
  // customer has already typed one.
  const [nameSeeded, setNameSeeded] = useState(false);
  if (!nameSeeded && session?.name) {
    setNameSeeded(true);
    setName((prev) => prev || session.name || "");
  }

  // Not a signed-in customer, or no completed booking → nothing to show.
  if (session?.type !== "customer" || !target) return null;

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
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: target.id,
          name: name.trim(),
          occasion: target.occasion,
          city: target.city,
          reviews: [
            {
              vendorId: vendor.id,
              vendor: vendor.name,
              rating,
              comment: comment.trim(),
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setStatus("idle");
        setError(
          data?.error ??
            t(
              "Something went wrong. Please try again.",
              "कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      // Mirror onto the stored booking so a return visit prefills for an edit.
      const review: BookingVendorReview = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };
      const kept = (target.reviews ?? []).filter(
        (r) => r.vendorId !== vendor.id,
      );
      updateStoredBooking(target.id, { reviews: [...kept, review] });
      setStatus("idle");
      setMode("view");
      onReviewed();
    } catch {
      setStatus("idle");
      setError(
        t("Network error. Please try again.", "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।"),
      );
    }
  };

  const fieldCls =
    "mt-1 w-full rounded-lg border border-cream-3 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon";
  const labelCls =
    "text-[11px] font-semibold uppercase tracking-wide text-maroon";

  // Already rated and not editing → compact summary + edit affordance. Keyed on
  // the local rating (not the reloaded `existing`) so a just-saved review shows
  // its summary immediately, without a flash of the form.
  if (mode === "view" && rating >= 1) {
    return (
      <div className="mt-6 rounded-2xl border border-maroon/20 bg-cream/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-ink">
              {t("Your review", "आपकी समीक्षा")}
            </p>
            <p
              aria-hidden="true"
              className="mt-1 text-2xl text-gold leading-none"
            >
              {"★".repeat(rating)}
              <span className="text-cream-3">{"★".repeat(5 - rating)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            {t("Edit review", "समीक्षा संपादित करें")}
          </button>
        </div>
        {comment && (
          <p className="mt-3 text-sm text-ink-soft">“{comment}”</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-maroon/20 bg-cream/40 p-5 sm:p-6">
      <p className="font-display text-lg text-ink">
        {existing
          ? t("Edit your review", "अपनी समीक्षा संपादित करें")
          : t("Rate this caterer", "इस कैटरर को रेट करें")}
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

      <p className="mt-2 text-xs text-ink-soft">
        {t(
          "Your review may appear publicly on this profile and our home page.",
          "आपकी समीक्षा इस प्रोफ़ाइल और हमारे होम पेज पर सार्वजनिक रूप से दिख सकती है।",
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
            : existing
              ? t("Update review", "समीक्षा अपडेट करें")
              : t("Submit review", "समीक्षा सबमिट करें")}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              setRating(existing.rating);
              setComment(existing.comment ?? "");
              setError("");
              setMode("view");
            }}
            className="rounded-full border border-cream-3 px-6 py-3 text-sm font-semibold text-ink-soft transition hover:bg-cream-2"
          >
            {t("Cancel", "रद्द करें")}
          </button>
        )}
      </div>
    </div>
  );
}
