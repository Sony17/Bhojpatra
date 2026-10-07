"use client";

/**
 * Public detail page for a live caterer — hero card photo, gallery, and the
 * full published menu by course (with dish photos and veg/non-veg marks).
 * Reached from the /vendors catalog. The primary CTA sells what this vendor
 * actually offers: a Single Stall booking (pre-selecting them, with their city)
 * when the booking roster has their stall — priced at that stall's own
 * per-plate rate — else their Baina Box panel, the feast wizard, their
 * Essential Service, or an enquiry.
 */

import { useMemo } from "react";
import Link from "next/link";
import type { PublicVendorProfile } from "@/lib/vendorMenus";
import { useLang } from "@/lib/i18n";
import { useCompare } from "@/lib/compare";
import StickyBookingBar from "@/components/StickyBookingBar";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import VendorActionRow from "@/components/vendors/VendorActionRow";
import BainaBoxOrderPanel from "@/components/vendors/BainaBoxOrderPanel";
import { Button, Card, Badge, AppBar, ImageCarousel } from "@/components/ui";
import { inr } from "@/lib/money";
import { bainaProductsFromVendorBoxes } from "@/lib/bainaBoxData";
import {
  ctaLabel,
  leadTimeLabel,
  profileCta,
  type BookableStall,
} from "@/lib/vendorStorefront";
import ReviewCard from "@/components/vendors/ReviewCard";
import { useVendorReviews } from "@/components/vendors/useVendorReviews";

export default function VendorProfile({
  profile,
  stall,
}: {
  profile: PublicVendorProfile;
  /** The Single Stall this vendor sells in the booking roster, or null. */
  stall: BookableStall | null;
}) {
  const { t, lang } = useLang();
  // The vendor's published boxes, flattened to one orderable line per size.
  const bainaProducts = useMemo(
    () => bainaProductsFromVendorBoxes(profile.bainaBoxes),
    [profile.bainaBoxes],
  );
  const { has, toggle, isFull } = useCompare();
  const inCompare = has(profile.id);
  const compareDisabled = !inCompare && isFull;
  // What the primary CTA sells (see `profileCta`).
  const cta = profileCta(profile, stall);
  const bookHref = cta.href;
  const bookText = cta.kind === "stall" ? t("Book Now", "अभी बुक करें") : ctaLabel(cta.kind, t);
  // The price beside the CTA is the price of what it sells.
  const boxFrom = bainaProducts.length
    ? Math.min(...bainaProducts.map((p) => p.price))
    : 0;
  const ctaPrice =
    cta.kind === "stall" && stall && stall.fromPerPlate > 0
      ? { amount: stall.fromPerPlate, note: t("per plate · single stall", "प्रति प्लेट · सिंगल स्टॉल") }
      : cta.kind === "baina" && boxFrom
        ? { amount: boxFrom, note: t("per box onwards", "प्रति बॉक्स से") }
        : cta.kind === "service" && profile.essentialService?.perGuest
          ? { amount: profile.essentialService.perGuest, note: t("per guest", "प्रति मेहमान") }
          : cta.kind === "feast"
            ? { amount: profile.priceFrom, note: t("per plate onwards", "प्रति प्लेट से") }
            : null;
  const minGuests = stall?.minGuests ?? profile.minPax;
  const leadText = leadTimeLabel(stall?.leadHours ?? profile.leadHours, t);

  // Real reviews for THIS vendor (by id — never borrowed from a same-named
  // business), aggregated from the published list.
  const { reviews, stat } = useVendorReviews({ ids: [profile.id] });
  const recent = reviews.slice(0, 6);
  const allPhotos = [profile.image, ...profile.gallery.filter((g) => g !== profile.image)];

  return (
    <section className="app-bottom-safe mx-auto max-w-7xl sm:px-5 sm:py-8 lg:py-12">
      <AppBar
        title={profile.business}
        subtitle={[profile.city, profile.state].filter(Boolean).join(", ")}
        backHref="/vendors"
        className="mb-2 sm:rounded-b-hero"
      />

      <div className="mt-2 grid grid-cols-1 gap-8 px-4 lg:grid-cols-5 lg:px-0">
        {/* Photos */}
        <div className="lg:col-span-3">
          <ImageCarousel
            slides={allPhotos.map((src) => ({
              src,
              alt: profile.business,
            }))}
            rounded="rounded-hero"
            aspect="aspect-[16/10]"
          />
        </div>

        {/* Summary card */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl text-ink sm:text-3xl">
                {profile.business}
              </h1>
              {profile.verified && (
                <Badge tone="solid">
                  <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
                </Badge>
              )}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true">📍</span>
              {profile.city}
              {profile.state && `, ${profile.state}`}
            </p>

            {stat && (
              <a href="#reviews" className="mt-2 block text-sm text-ink hover:underline">
                ⭐ {stat.rating}{" "}
                <span className="text-ink-soft">
                  ({inr.format(stat.count)} {t("reviews", "समीक्षाएँ")})
                </span>
              </a>
            )}

            {/* Vendor-declared Google reputation — a distinct badge shown
                alongside any Bhojpatra reviews. */}
            {profile.googleRating ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cream-3 bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink">
                <span aria-hidden="true" className="text-maroon">★</span>
                <span className="font-bold">{profile.googleRating}</span>
                <span className="text-ink-soft">
                  {t("Google", "गूगल")}
                  {profile.googleReviews
                    ? ` · ${inr.format(profile.googleReviews)} ${t("reviews", "समीक्षाएँ")}`
                    : ""}
                </span>
              </p>
            ) : (
              !stat && (
                <p className="mt-2 text-sm font-semibold text-maroon">
                  {t("New on Bhojpatra", "भोजपत्र पर नया")}
                </p>
              )
            )}

            {profile.cuisines.length > 0 && (
              <div className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
                {profile.cuisines.map((c) => (
                  <span
                    key={c}
                    className="shrink-0 whitespace-nowrap rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink-soft"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {profile.about && (
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {profile.about}
              </p>
            )}

            {ctaPrice ? (
              <p className="mt-5 font-display text-2xl font-bold text-maroon">
                ₹{inr.format(ctaPrice.amount)}
                <span className="text-sm font-normal text-ink-soft">
                  {" "}
                  {ctaPrice.note}
                </span>
              </p>
            ) : (
              <p className="mt-5 text-sm font-semibold text-ink-soft">
                {t("Price on enquiry", "कीमत पूछताछ पर")}
              </p>
            )}

            {/* The vendor's own booking terms, as the booking flow applies them. */}
            {(minGuests || leadText) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {minGuests ? (
                  <Badge tone="soft">
                    {t(`Min ${minGuests} guests`, `न्यूनतम ${minGuests} मेहमान`)}
                  </Badge>
                ) : null}
                {leadText && <Badge tone="soft">{leadText}</Badge>}
              </div>
            )}

            <VendorActionRow
              bookHref={bookHref}
              bookLabel={bookText}
              vendorName={profile.business}
              vendorCity={profile.city}
              priceFrom={ctaPrice?.amount}
              inCompare={inCompare}
              compareDisabled={compareDisabled}
              onToggleCompare={() => toggle(profile.id)}
              className="mt-5"
            />
          </Card>
        </div>
      </div>

      {/* Browse Menu CTA */}
      <div className="mt-6 sm:mt-8">
        <Link
          href={`/vendors/${profile.id}/menu`}
          className="focus-ring flex items-center justify-between rounded-xl border border-cream-3 bg-white p-4 shadow-xs transition hover:border-maroon/20 hover:bg-cream/30 active:scale-[0.99] sm:rounded-2xl sm:p-5"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-lg sm:h-11 sm:w-11 sm:text-xl">
              📖
            </span>
            <div>
              <p className="text-sm font-bold text-ink sm:text-base">
                {t("Browse Menu", "मेन्यू देखें")}
              </p>
              <p className="text-xs text-ink-soft sm:text-xs">
                {t("View complete dishes, categories & per-plate prices", "सभी व्यंजन, श्रेणियाँ और कीमतें देखें")}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-maroon sm:text-sm">
            {t("Explore", "देखें")} →
          </span>
        </Link>
      </div>

      {/* Live counters & services the caterer offers (from the platform add-on set). */}
      {profile.counters.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-ink">
            {t("Live Counters & Services", "लाइव काउंटर और सेवाएं")}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.counters.map((c) => (
              <Card key={c.id} padding="none" className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-lg">
                    <span aria-hidden="true">{c.icon}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {lang === "hi" ? c.nameHi : c.name}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      ₹{inr.format(c.price)}
                      {c.perPlate ? `/${t("plate", "प्लेट")}` : ` ${t("flat", "एकमुश्त")}`}
                    </span>
                  </span>
                </div>
                {/* Exactly what this caterer serves on the counter — their own
                    pick from its set menu, not the untrimmed platform list. */}
                {c.items.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-cream-3 pt-3">
                    {c.items.map((item) => (
                      <li
                        key={item.name}
                        className="rounded-full border border-cream-3 bg-cream/40 px-2.5 py-1 text-xs text-ink"
                      >
                        {lang === "hi" ? item.nameHi : item.name}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Baina Box menu — the same per-box order panel the curated Baina Box
          storefronts use, so a vendor who published a box menu is orderable
          here (per box, at their own ½ kg / 1 kg / custom-size prices) instead
          of only being on show. Every size is its own line. */}
      {bainaProducts.length > 0 && (
        <BainaBoxOrderPanel
          data={{
            vendorId: profile.id,
            name: profile.business,
            location: profile.city,
            products: bainaProducts,
          }}
          heading={`🎁 ${t("Our Baina Boxes", "हमारे बैना बॉक्स")}`}
        />
      )}

      {/* Essential Service offer — service crew & setup at the vendor's rate. */}
      {profile.essentialService && (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-ink">
            <span aria-hidden="true">🍽️</span>{" "}
            {t("Essential Service", "एसेंशियल सर्विस")}
          </h2>
          <Card padding="none" className="mt-5 p-5 sm:p-6">
            <p className="text-sm text-ink-soft">
              {t(
                "Serving crew, buffet setup & essentials",
                "सर्विस स्टाफ, बुफे सेटअप और ज़रूरी सामान",
              )}
              {" · "}
              <span className="font-semibold text-ink">
                {profile.essentialService.perGuest > 0
                  ? `₹${inr.format(profile.essentialService.perGuest)}/${t("guest", "मेहमान")}`
                  : t("rate on request", "दर अनुरोध पर")}
              </span>
            </p>
            {profile.essentialService.includes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.essentialService.includes.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-cream-3 bg-cream/40 px-3.5 py-1.5 text-sm text-ink"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Ratings & recent reviews — real, published reviews of THIS vendor. */}
      <div id="reviews" className="mt-12 scroll-mt-32 px-4 lg:px-0">
        <h2 className="font-display text-2xl text-ink">
          {t("Ratings & reviews", "रेटिंग और समीक्षाएँ")}
        </h2>
        {stat ? (
          <>
            <p className="mt-2 text-sm text-ink">
              <span className="font-bold">⭐ {stat.rating}/5</span>{" "}
              <span className="text-ink-soft">
                {t(
                  `from ${stat.count} ${stat.count === 1 ? "review" : "reviews"} of completed bookings`,
                  `${stat.count} पूर्ण बुकिंग समीक्षाओं से`,
                )}
              </span>
            </p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {recent.map((r) => (
                <ReviewCard key={`${r.bookingId}:${r.vendorId}`} review={r} />
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            {t(
              "No reviews yet — reviews appear here after completed Bhojpatra bookings.",
              "अभी कोई समीक्षा नहीं — पूर्ण बुकिंग के बाद समीक्षाएँ यहाँ दिखेंगी।",
            )}
          </p>
        )}
      </div>

      {/* Mobile sticky booking bar — the same CTA, href and price as above. */}
      <StickyBookingBar
        price={ctaPrice ? `₹${inr.format(ctaPrice.amount)}` : t("On enquiry", "पूछताछ पर")}
        priceNote={ctaPrice?.note ?? ""}
        cta={bookText}
        href={bookHref}
      />
    </section>
  );
}
