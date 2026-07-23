"use client";

import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import Button from "@/components/ui/Button";

/** Initials fallback when a brand has no uploaded logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Featured brands — a continuous left→right marquee of centered photo cards
 * (cover, centered logo badge, name, category • location, rating and years).
 * The track holds two identical copies and glides via a CSS transform
 * (`.animate-marquee-ltr`), so it can never stall on sub-pixel scroll rounding;
 * hovering the ribbon pauses it, and it stays still under reduced-motion.
 * CMS-driven via Admin → Content Control → Home Page → Brand Ribbon.
 */
export default function BrandRibbon() {
  const { lang, t } = useLang();
  const { brandRibbon } = useHomeContent();

  if (!brandRibbon.enabled || brandRibbon.brands.length === 0) return null;

  const brands = brandRibbon.brands;
  const heading = lang === "hi" ? brandRibbon.headingHi : brandRibbon.heading;

  const cardSize =
    "h-[8.75rem] w-[35vw] max-w-[7.5rem] shrink-0 sm:w-[7.25rem] sm:max-w-none lg:w-[7.5rem]";

  return (
    <section className="relative overflow-hidden border-y border-maroon/10 bg-cream/20">
      <span
        aria-hidden
        className="absolute -left-24 top-8 h-56 w-56 rounded-full bg-maroon/[0.03]"
      />
      <span
        aria-hidden
        className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-cream/40"
      />
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow inline-flex items-center gap-3 text-[10px] font-semibold tracking-[0.26em] text-maroon">
            <span aria-hidden className="h-px w-6 bg-maroon/50" />
            {t("Trusted by India's finest", "भारत के बेहतरीन ब्रांड्स का भरोसा")}
          </p>
          <h2 className="font-display mt-3 text-title text-maroon">
            {t("Our Featured Brands", "हमारे चुनिंदा ब्रांड")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/65 sm:text-[15px]">
            {heading ||
              t(
                "Handpicked caterers and venues that make every celebration unforgettable.",
                "चुनिंदा कैटरर और वेन्यू जो हर उत्सव को यादगार बनाते हैं।",
              )}
          </p>
          <span
            aria-hidden
            className="mx-auto mt-5 block h-1.5 w-1.5 rotate-45 bg-maroon/50"
          />
        </header>

        <div className="marquee-pause relative mt-8 overflow-hidden py-3 sm:mt-10 sm:py-4">
          <ul
            aria-label={t("Featured brands", "चुनिंदा ब्रांड")}
            className="animate-marquee-ltr flex w-max items-stretch gap-2"
          >
            {[0, 1].map((copy) => (
              <Fragment key={copy}>
                {brands.map((brand) => {
                  const name = lang === "hi" ? brand.nameHi : brand.name;
                  const location =
                    lang === "hi" ? brand.locationHi : brand.location;
                  const category =
                    lang === "hi" ? brand.categoryHi : brand.category;
                  const showRating = brand.rating > 0;
                  const showReviews = brand.reviewCount > 0;
                  const years =
                    brand.since > 0
                      ? Math.max(1, new Date().getFullYear() - brand.since)
                      : 0;
                  const meta = [category, location].filter(Boolean).join(" • ");

                  return (
                    <li
                      key={`${brand.id}-${copy}`}
                      aria-hidden={copy === 1 || undefined}
                      className={cardSize}
                    >
                      <Link
                        href={`/vendors?q=${encodeURIComponent(brand.name)}`}
                        tabIndex={copy === 1 ? -1 : undefined}
                        className="group flex h-full flex-col overflow-hidden rounded-lg border border-maroon/15 bg-white ring-1 ring-cream/30 shadow-[0_8px_20px_-11px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-maroon/35 hover:shadow-[0_12px_24px_-12px_rgba(185,32,37,0.55)] active:scale-[0.98]"
                      >
                        {/* Cover — ~40% of card */}
                        <div className="relative h-[3.5rem] shrink-0 overflow-hidden bg-maroon sm:h-[3.75rem]">
                          {brand.image ? (
                            <Image
                              src={brand.image}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 120px, 35vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              unoptimized={isUnoptimized(brand.image)}
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="absolute inset-0 bg-gradient-to-br from-maroon to-ink"
                            />
                          )}
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent"
                          />
                        </div>

                        {/* Body — centered logo + copy */}
                        <div className="relative flex min-h-0 flex-1 flex-col items-center px-2 pb-1.5 pt-[1.15rem] text-center">
                          <span className="absolute left-1/2 top-0 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-md border border-maroon/10 bg-white shadow-[0_4px_10px_-6px_rgba(0,0,0,0.45)] sm:h-8 sm:w-8">
                            {brand.logo ? (
                              <Image
                                src={brand.logo}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                                unoptimized={isUnoptimized(brand.logo)}
                              />
                            ) : (
                              <span className="text-[8px] font-semibold tracking-wide text-maroon">
                                {initials(brand.name)}
                              </span>
                            )}
                          </span>

                          <span className="line-clamp-1 text-[10px] font-semibold leading-tight text-ink sm:text-[11px]">
                            {name}
                          </span>

                          <span className="mt-0.5 line-clamp-1 min-h-[0.7rem] text-[8px] font-medium text-ink/70">
                            {meta || " "}
                          </span>

                          <div className="mt-auto flex w-full items-center justify-between gap-1 border-t border-maroon/10 pt-1 text-[8px]">
                            <span className="flex min-w-0 items-center gap-0.5 font-medium text-ink/70">
                              {showRating ? (
                                <>
                                  <span
                                    aria-hidden
                                    className="text-[9px] leading-none text-maroon"
                                  >
                                    ★
                                  </span>
                                  <span className="font-semibold text-ink">
                                    {brand.rating.toFixed(1)}
                                  </span>
                                  {showReviews ? (
                                    <span className="font-normal text-ink/60">
                                      ({brand.reviewCount})
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                " "
                              )}
                            </span>
                            <span className="shrink-0 font-medium text-ink/70">
                              {years > 0
                                ? t(`${years}+ Years`, `${years}+ वर्ष`)
                                : " "}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </Fragment>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-center sm:mt-7">
          <Button
            href="/vendors"
            variant="secondary"
            rightIcon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            }
          >
            {t("Find brands to explore more", "और ब्रांड खोजें")}
          </Button>
        </div>
      </div>
    </section>
  );
}
