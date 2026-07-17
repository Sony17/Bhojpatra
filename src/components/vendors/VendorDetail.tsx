"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { vendorListings, cities, type VendorListing } from "@/lib/data";
import {
  slugifyName,
  fetchMyBookings,
  onStoredBookingsChange,
  type StoredBooking,
} from "@/lib/bookings";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { useCompare } from "@/lib/compare";
import { openCompareTable } from "@/lib/compareTray";
import CompareTray from "@/components/vendors/CompareTray";
import StickyBookingBar from "@/components/StickyBookingBar";
import VendorReviewPanel from "@/components/vendors/VendorReviewPanel";
import ReviewCard from "@/components/vendors/ReviewCard";
import { Stars, StarIcon } from "@/components/reviews/reviewDisplay";
import { Button, AppBar } from "@/components/ui";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

/** One customer review as returned by `GET /api/reviews`. */
interface StoredReview {
  /** The booking this review is for — matches one of the signed-in customer's
   *  own orders when it's their review (so it becomes editable). */
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
        <Button href="/vendors" variant="primary" size="lg" className="mt-6">
          {t("Back to Caterers", "कैटरर पर वापस")}
        </Button>
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

  const session = useSession();

  // The signed-in customer's own orders — kept live so a review whose booking id
  // matches one of these can be told apart as "theirs" and made editable inline.
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

  // Star breakdown for the ratings summary, built from the written reviews we
  // actually loaded. The headline count equals this list's length whenever any
  // written review exists, so the breakdown and headline never disagree.
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
    <section
      className={
        "app-bottom-safe mx-auto max-w-6xl sm:px-5 sm:py-6 lg:py-10 " +
        (compareCount > 0 ? "pb-32 sm:pb-36" : "")
      }
    >
      <AppBar
        title={vendor.name}
        subtitle={`${vendor.city}, ${vendor.state}`}
        backHref="/vendors"
        className="mb-2 sm:rounded-b-hero"
        trailing={
          <WhatsAppShareButton
            path={`/vendors/${vendor.id}`}
            message={`Check out ${vendor.name} on Bhojpatra`}
            messageHi={`भोजपत्र पर ${vendor.name} देखें`}
            variant="ghost"
            size="sm"
            label=""
            labelHi=""
          />
        }
      />

      <div className="mt-2 grid gap-6 px-4 lg:mt-4 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:px-0">
        {/* ── Showcase ──────────────────────────────────────────────── */}
        <div>
          <div className="relative -mx-4 aspect-[16/10] w-[calc(100%+2rem)] overflow-hidden bg-cream sm:mx-0 sm:aspect-[4/3] sm:w-full sm:rounded-hero sm:border sm:border-maroon/6 sm:shadow-card">
            <Image
              src={vendor.image}
              alt={vendor.name}
              fill
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent sm:hidden"
            />
            <span className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
              {vendor.tiers.map((tier) => (
                <span
                  key={tier}
                  className={
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm sm:px-3 sm:text-xs " +
                    tierBadgeClass(tier)
                  }
                >
                  {localize(tier)}
                </span>
              ))}
            </span>
            {vendor.verified && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-maroon shadow-sm backdrop-blur-sm sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
              </span>
            )}
            <a
              href="#reviews"
              className="absolute bottom-3 left-3 inline-flex items-center gap-0.5 rounded bg-maroon px-1.5 py-0.5 text-[11px] font-bold text-cream shadow-sm sm:hidden"
            >
              {shownRating}
              <span aria-hidden>★</span>
            </a>
          </div>

          <div className="mt-4 sm:mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-sans text-xl font-bold tracking-tight text-ink sm:font-display sm:text-3xl sm:font-normal">
                {vendor.name}
              </h1>
              <a
                href="#reviews"
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-cream-3 sm:inline-flex"
              >
                <StarIcon className="h-4 w-4 text-maroon" />
                {shownRating}
                <span className="font-normal text-ink-soft">({shownCount})</span>
              </a>
            </div>

            <p className="mt-1.5 text-[13px] text-ink/55 sm:mt-2 sm:text-sm sm:text-ink-soft">
              {vendor.city}, {vendor.state}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
              {vendor.cuisines.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink/60 sm:px-3 sm:text-xs sm:text-ink-soft"
                >
                  {c}
                </span>
              ))}
              <span className="rounded-full border border-maroon/15 px-2.5 py-1 text-[11px] font-medium text-ink/60 sm:px-3 sm:text-xs">
                {localize(vendor.diet)}
              </span>
            </div>

            <p className="mt-2.5 text-[12px] text-ink/50 sm:mt-3 sm:text-sm sm:text-ink-soft">
              <span className="font-semibold text-ink">{t("Serves", "परोसता है")}:</span>{" "}
              {vendor.mealTypes.map(localize).join(" · ")}
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

            <Button
              href={bookHref}
              variant="primary"
              size="lg"
              fullWidth
              className="mt-5"
            >
              {t("Book this caterer", "यह कैटरर बुक करें")} →
            </Button>
            <Button
              variant={inCompare ? "primary" : "secondary"}
              size="lg"
              fullWidth
              onClick={() => toggle(vendor.id)}
              disabled={compareDisabled}
              aria-pressed={inCompare}
              className="mt-3"
              leftIcon={<span aria-hidden="true">{inCompare ? "✓" : "+"}</span>}
            >
              {inCompare
                ? t("Added to compare", "तुलना में जोड़ा")
                : compareDisabled
                  ? t("Compare list is full", "तुलना सूची भर गई है")
                  : t("Add to compare", "तुलना में जोड़ें")}
            </Button>
            {compareCount >= 2 && (
              <button
                type="button"
                onClick={openCompareTable}
                className="mt-2 block w-full text-center text-sm font-semibold text-maroon hover:underline"
              >
                {t(
                  `Compare ${compareCount} selected →`,
                  `${compareCount} चुने हुए की तुलना करें →`,
                )}
              </button>
            )}

            {/* Spread the word — forward this caterer to friends on WhatsApp. */}
            <WhatsAppShareButton
              path={`/vendors/${vendor.id}`}
              variant="ghost"
              fullWidth
              className="mt-3"
              label="Share this caterer"
              labelHi="यह कैटरर शेयर करें"
              message={`Check out ${vendor.name} on Bhojpatra — a verified caterer in ${vendor.city} from ₹${vendor.priceFrom.toLocaleString("en-IN")}/plate.`}
              messageHi={`${vendor.name} को Bhojpatra पर देखें — ${vendor.city} में एक वेरिफाइड कैटरर, ₹${vendor.priceFrom.toLocaleString("en-IN")}/प्लेट से।`}
            />

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

      {/* ── Ratings & reviews ─────────────────────────────────────────── */}
      <div id="reviews" className="mt-14 scroll-mt-32 border-t border-cream-3 pt-10">
        <p className="eyebrow text-xs font-semibold text-maroon">
          {t("Ratings & reviews", "रेटिंग और समीक्षाएँ")}
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
          {t("What guests say", "मेहमान क्या कहते हैं")}
        </h2>

        {/* Summary — headline score alongside the star breakdown (or, until
            written reviews land, the reasons the rating can be trusted). */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-3 bg-white shadow-sm">
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
        </div>

        {/* Signed-in customers who've completed a booking can rate this caterer
            right here — mirrors the My Bookings review flow. */}
        <VendorReviewPanel vendor={vendor} onReviewed={loadReviews} />

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
          <div className="mt-8 rounded-3xl border border-dashed border-cream-3 bg-white p-10 text-center">
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

      <CompareTray />

      {/* Mobile sticky booking bar — steps aside for the compare tray. */}
      <StickyBookingBar
        price={`₹${vendor.priceFrom.toLocaleString("en-IN")}`}
        priceNote={t("per plate", "प्रति प्लेट")}
        cta={t("Book this caterer", "यह कैटरर बुक करें")}
        href={bookHref}
      />
    </section>
  );
}
