"use client";

/**
 * Public detail page for a live caterer — hero card photo, gallery, and the
 * full published menu by course (with dish photos and veg/non-veg marks).
 * Reached from the /vendors catalog; the CTA hands off to the /book wizard.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicVendorProfile } from "@/lib/vendorMenus";
import { useLang } from "@/lib/i18n";

const inr = new Intl.NumberFormat("en-IN");

export default function VendorProfile({
  profile,
}: {
  profile: PublicVendorProfile;
}) {
  const { t, lang } = useLang();
  // The photo shown large — the card photo by default, or a tapped gallery shot.
  const [heroUrl, setHeroUrl] = useState(profile.image);

  const allPhotos = [profile.image, ...profile.gallery.filter((g) => g !== profile.image)];

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      {/* Breadcrumb back to the catalog */}
      <Link
        href="/vendors"
        className="text-sm font-semibold text-maroon hover:underline"
      >
        ← {t("All Caterers", "सभी कैटरर")}
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Photos */}
        <div className="lg:col-span-3">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-cream-3 bg-cream-2">
            <Image
              src={heroUrl}
              alt={profile.business}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              className="object-cover"
            />
          </div>
          {allPhotos.length > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {allPhotos.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setHeroUrl(url)}
                  aria-pressed={heroUrl === url}
                  className={
                    "relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition " +
                    (heroUrl === url
                      ? "border-maroon ring-2 ring-maroon"
                      : "border-cream-3 hover:border-maroon")
                  }
                >
                  <Image src={url} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary card */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-cream-3 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl text-ink sm:text-3xl">
                {profile.business}
              </h1>
              {profile.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
                  <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
                </span>
              )}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true">📍</span>
              {profile.city}
              {profile.state && `, ${profile.state}`}
            </p>

            {profile.reviews > 0 ? (
              <p className="mt-2 text-sm text-ink">
                ⭐ {profile.rating}{" "}
                <span className="text-ink-soft">
                  ({inr.format(profile.reviews)} {t("reviews", "समीक्षाएँ")})
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-maroon">
                {t("New on Bhojpatra", "भोजपत्र पर नया")}
              </p>
            )}

            {profile.cuisines.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.cuisines.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-cream-2 px-2.5 py-1 text-xs font-medium text-ink-soft"
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

            <p className="mt-5 font-display text-2xl font-bold text-maroon">
              ₹{inr.format(profile.priceFrom)}
              <span className="text-sm font-normal text-ink-soft">
                {" "}
                / {t("plate onwards", "प्लेट से")}
              </span>
            </p>

            <Link
              href="/book"
              className="mt-5 block rounded-full bg-maroon px-6 py-3 text-center text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              {t("Start a Booking", "बुकिंग शुरू करें")}
            </Link>
            <p className="mt-2 text-center text-xs text-ink-soft">
              {t(
                "Pick this caterer while building your menu in the booking wizard.",
                "बुकिंग विज़ार्ड में मेन्यू बनाते समय इस कैटरर को चुनें।",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Menu by course */}
      <div className="mt-12">
        <h2 className="font-display text-2xl text-ink">
          {t("Menu", "मेन्यू")}
        </h2>
        <div className="mt-5 space-y-5">
          {profile.menu.map((course) => (
            <div
              key={course.categoryId}
              className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-lg">
                  <span aria-hidden="true">{course.icon}</span>
                </span>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {lang === "hi" ? course.nameHi : course.name}
                </h3>
                <span className="text-sm text-ink-soft">
                  + ₹{inr.format(course.perPlate)}/{t("plate", "प्लेट")}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.items.map((it, i) => (
                  <span
                    key={`${it.name}-${i}`}
                    className="flex items-center gap-1.5 rounded-full border border-cream-3 bg-cream/40 py-1.5 pl-2 pr-4 text-sm text-ink"
                  >
                    {it.photo && (
                      <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full border border-cream-3">
                        <Image src={it.photo} alt="" fill sizes="28px" className="object-cover" />
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={
                        "inline-block h-2.5 w-2.5 rounded-sm border " +
                        (it.diet === "veg" ? "border-ink" : "border-maroon bg-maroon")
                      }
                    />
                    {it.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
