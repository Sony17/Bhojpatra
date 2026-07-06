"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { vendorListings, cities, type VendorListing } from "@/lib/data";
import { slugifyName } from "@/lib/bookings";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { useCompare } from "@/lib/compare";
import CompareTray from "@/components/vendors/CompareTray";
import VendorReviewPanel from "@/components/vendors/VendorReviewPanel";

/** One customer review as returned by `GET /api/reviews`. */
interface StoredReview {
  vendorId: string;
  vendor: string;
  name: string;
  occasion: string;
  city: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** ISO timestamp → "12 Dec 2026" (matches the booking-list date style). */
function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Five stars, filled up to `rating` (rounded). */
function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" className="text-gold">
      {"★".repeat(filled)}
      <span className="text-cream-3">{"★".repeat(Math.max(0, 5 - filled))}</span>
    </span>
  );
}

/** Brand-aligned tier badge styling (mirrors the catalogue card). */
function tierBadgeClass(tier: VendorListing["tiers"][number]): string {
  switch (tier) {
    case "Platinum":
      return "bg-maroon text-cream";
    case "Gold":
      return "bg-cream-3 text-ink";
    default:
      return "bg-cream-2 text-ink";
  }
}

export default function VendorDetail({ id }: { id: string }) {
  const { t } = useLang();
  const vendor = useMemo(
    () => vendorListings.find((v) => v.id === id) ?? null,
    [id],
  );

  if (!vendor) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Caterer not found", "कैटरर नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This caterer may have been removed. Browse all caterers instead.",
            "यह कैटरर हटाया जा चुका हो सकता है। सभी कैटरर देखें।",
          )}
        </p>
        <Link
          href="/vendors"
          className="mt-6 inline-block rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Back to Caterers", "कैटरर पर वापस")}
        </Link>
      </section>
    );
  }

  return <VendorProfile vendor={vendor} t={t} />;
}

function VendorProfile({
  vendor,
  t,
}: {
  vendor: VendorListing;
  t: (en: string, hi: string) => string;
}) {
  const ratings = useVendorRatings();
  const stats = statFor(ratings, vendor);

  const { has, toggle, isFull, count: compareCount } = useCompare();
  const inCompare = has(vendor.id);
  const compareDisabled = !inCompare && isFull;

  // Real, customer-submitted reviews for this vendor. Best-effort — falls back
  // to an empty list (and the "no reviews yet" state) on any failure. Exposed as
  // a callback so the review panel can re-pull the list after a fresh submit.
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const loadReviews = useCallback(() => {
    const slug = slugifyName(vendor.name);
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews?: StoredReview[] } | null) => {
        if (!d?.reviews) return;
        setReviews(
          d.reviews.filter(
            (r) =>
              (r.vendorId && r.vendorId === vendor.id) ||
              slugifyName(r.vendor ?? "") === slug,
          ),
        );
      })
      .catch(() => {});
  }, [vendor.id, vendor.name]);
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const localize = (value: string): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg & Non-Veg", "वेज और नॉन-वेज");
      case "Silver":
        return t("Silver", "सिल्वर");
      case "Gold":
        return t("Gold", "गोल्ड");
      case "Platinum":
        return t("Platinum", "प्लैटिनम");
      case "Breakfast":
        return t("Breakfast", "नाश्ता");
      case "Lunch":
        return t("Lunch", "दोपहर का भोजन");
      case "Dinner":
        return t("Dinner", "रात्रि भोज");
      case "Starters":
        return t("Starters", "स्टार्टर");
      case "Main Course":
        return t("Main Course", "मुख्य व्यंजन");
      case "Desserts":
        return t("Desserts", "मिठाई");
      case "Live Counters":
        return t("Live Counters", "लाइव काउंटर");
      default:
        return value;
    }
  };

  // "Book this caterer" drops the guest onto the wizard's vendor-selection step,
  // pre-filtered to this caterer's city. City is stored by name here but the
  // wizard keys off the city id, so bridge through the `cities` table.
  const cityId = cities.find((c) => c.name === vendor.city)?.id;
  const bookHref = `/book?${cityId ? `city=${cityId}&` : ""}step=menu`;

  // A live aggregate from the reviews just loaded for this vendor, so a rating
  // submitted from the panel below is reflected immediately (the shared
  // `useVendorRatings` summary only fetches once on mount).
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
  const shownRating = verified?.rating ?? vendor.rating;
  const shownCount = verified?.count ?? vendor.reviews;

  return (
    <section
      className={
        "mx-auto max-w-6xl px-5 py-10 sm:py-14 " +
        (compareCount > 0 ? "pb-32 sm:pb-36" : "")
      }
    >
      <Link
        href="/vendors"
        className="text-sm font-semibold text-maroon hover:underline"
      >
        ← {t("All Caterers", "सभी कैटरर")}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Showcase ──────────────────────────────────────────────── */}
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-cream-3 bg-cream-2 shadow-sm">
            <Image
              src={vendor.image}
              alt={vendor.name}
              fill
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              {vendor.tiers.map((tier) => (
                <span
                  key={tier}
                  className={
                    "rounded-full px-3 py-1 text-xs font-semibold shadow-sm " +
                    tierBadgeClass(tier)
                  }
                >
                  {localize(tier)}
                </span>
              ))}
            </span>
            {vendor.verified && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
                <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
              </span>
            )}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl text-ink">{vendor.name}</h1>
              {/* Rating badge — jumps to the reviews section below. */}
              <a
                href="#reviews"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-2 px-3 py-1 text-sm font-medium text-ink transition-colors hover:bg-cream-3"
              >
                <span aria-hidden="true" className="text-gold">⭐</span>
                {shownRating}
                <span className="text-ink-soft">({shownCount})</span>
              </a>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true">📍</span>
              {vendor.city}, {vendor.state}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {vendor.cuisines.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-cream-2 px-3 py-1 text-xs font-medium text-ink-soft"
                >
                  {c}
                </span>
              ))}
              <span className="rounded-full bg-surface-beige px-3 py-1 text-xs font-medium text-ink-soft">
                {localize(vendor.diet)}
              </span>
            </div>

            <p className="mt-3 flex flex-wrap items-start gap-1.5 text-sm text-ink-soft">
              <span className="font-semibold text-ink">{t("Serves", "परोसता है")}:</span>
              <span>{vendor.mealTypes.map(localize).join(" · ")}</span>
            </p>
          </div>
        </div>

        {/* ── Booking panel ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs text-ink-soft">{t("From", "से")}</p>
            <p className="font-display text-3xl font-bold text-maroon">
              ₹{vendor.priceFrom.toLocaleString("en-IN")}{" "}
              <span className="text-base font-normal text-ink-soft">
                / {t("plate", "प्लेट")}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {t(
                "Final price depends on your menu, guest count and add-ons.",
                "अंतिम कीमत आपके मेन्यू, मेहमानों की संख्या और ऐड-ऑन पर निर्भर करती है।",
              )}
            </p>

            <Link
              href={bookHref}
              className="mt-5 block w-full rounded-full bg-maroon px-6 py-3 text-center text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              {t("Book this caterer", "यह कैटरर बुक करें")} →
            </Link>
            <button
              type="button"
              onClick={() => toggle(vendor.id)}
              disabled={compareDisabled}
              aria-pressed={inCompare}
              className={
                "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border px-6 py-3 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 " +
                (inCompare
                  ? "border-maroon bg-maroon text-cream hover:bg-maroon-dark"
                  : "border-maroon text-maroon hover:bg-maroon/5")
              }
            >
              <span aria-hidden="true">{inCompare ? "✓" : "+"}</span>
              {inCompare
                ? t("Added to compare", "तुलना में जोड़ा")
                : compareDisabled
                  ? t("Compare list is full", "तुलना सूची भर गई है")
                  : t("Add to compare", "तुलना में जोड़ें")}
            </button>
            {compareCount > 0 && (
              <Link
                href="/compare"
                className="mt-2 block text-center text-sm font-semibold text-maroon hover:underline"
              >
                {t(
                  `Compare ${compareCount} selected →`,
                  `${compareCount} चुने हुए की तुलना करें →`,
                )}
              </Link>
            )}

            <dl className="mt-5 space-y-2 border-t border-cream-3 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">{t("Location", "स्थान")}</dt>
                <dd className="font-medium text-ink">{vendor.city}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">{t("Tiers", "टियर")}</dt>
                <dd className="font-medium text-ink">
                  {vendor.tiers.map(localize).join(", ")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">{t("Rating", "रेटिंग")}</dt>
                <dd className="font-medium text-ink">
                  {shownRating} ({shownCount})
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* ── Reviews ───────────────────────────────────────────────────── */}
      <div id="reviews" className="mt-12 scroll-mt-32 border-t border-cream-3 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">
            {t("Reviews", "समीक्षाएँ")}
          </h2>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Stars rating={shownRating} />
            <span className="font-semibold text-ink">{shownRating}</span>
            {verified ? (
              <span>
                {t(
                  `· ${verified.count} verified ${verified.count === 1 ? "review" : "reviews"}`,
                  `· ${verified.count} सत्यापित समीक्षाएँ`,
                )}
              </span>
            ) : (
              <span>
                {t(`· ${vendor.reviews} reviews`, `· ${vendor.reviews} समीक्षाएँ`)}
              </span>
            )}
          </p>
        </div>

        {/* Signed-in customers who've completed a booking can rate this caterer
            right here — mirrors the My Bookings review flow. */}
        <VendorReviewPanel vendor={vendor} onReviewed={loadReviews} />

        {reviews.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((r, i) => (
              <li
                key={`${r.vendorId}-${r.name}-${i}`}
                className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{r.name}</p>
                  <Stars rating={r.rating} />
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {[r.occasion, r.city].filter(Boolean).join(" · ")}
                  {r.createdAt && ` · ${formatReviewDate(r.createdAt)}`}
                </p>
                {r.comment && (
                  <p className="mt-3 text-sm text-ink-soft">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-cream-3 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-ink">
              {t("No reviews yet", "अभी कोई समीक्षा नहीं")}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {t(
                "Be the first to book and review this caterer.",
                "इस कैटरर को बुक और रिव्यू करने वाले पहले व्यक्ति बनें।",
              )}
            </p>
          </div>
        )}
      </div>

      <CompareTray />
    </section>
  );
}
