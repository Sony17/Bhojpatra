"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/** Initials fallback when a brand has no uploaded logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Flourish({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 10"
      aria-hidden="true"
      className={`h-2 w-10 text-maroon/50 sm:w-14 ${flip ? "-scale-x-100" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    >
      <path d="M1 5h40" />
      <path d="M41 5c4 0 6-2 9-2s5 2 8 2" />
      <circle cx="66" cy="5" r="1.5" />
      <path d="M70 5h8" />
    </svg>
  );
}

function NavArrow({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-maroon/15 bg-white text-maroon shadow-soft transition-all hover:border-maroon/35 hover:shadow-card disabled:pointer-events-none disabled:opacity-30 sm:h-9 sm:w-9 ${
        direction === "prev" ? "left-0" : "right-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        {direction === "prev" ? (
          <path d="M15 18l-6-6 6-6" />
        ) : (
          <path d="M9 18l6-6-6-6" />
        )}
      </svg>
    </button>
  );
}

/**
 * Featured brands — centered photo cards in a horizontal carousel (cover,
 * centered logo badge, name, category • location, rating and years).
 * CMS-driven via Admin → Content Control → Home Page → Brand Ribbon.
 */
export default function BrandRibbon() {
  const { lang, t } = useLang();
  const { brandRibbon } = useHomeContent();
  const trackRef = useRef<HTMLUListElement>(null);
  const autoPausedRef = useRef(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateNav = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateNav();
    el.addEventListener("scroll", updateNav, { passive: true });
    window.addEventListener("resize", updateNav);
    return () => {
      el.removeEventListener("scroll", updateNav);
      window.removeEventListener("resize", updateNav);
    };
  }, [updateNav, brandRibbon.brands.length]);

  useEffect(() => {
    const el = trackRef.current;
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!el || reducedMotion || brandRibbon.brands.length < 2) return;

    let initFrame = 0;
    let animationFrame = 0;
    let previous = 0;

    const loopStart = () =>
      el.querySelector<HTMLElement>("[data-loop-start]")?.offsetLeft ?? 0;

    // Start on the duplicate set, then move toward the first set. Resetting
    // at zero is visually seamless because both sets are identical.
    initFrame = requestAnimationFrame(() => {
      el.scrollLeft = loopStart();
    });

    const animate = (time: number) => {
      if (previous && !autoPausedRef.current) {
        el.scrollLeft -= ((time - previous) / 1000) * 14;
        if (el.scrollLeft <= 1) el.scrollLeft = loopStart();
      }
      previous = time;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(initFrame);
      cancelAnimationFrame(animationFrame);
    };
  }, [brandRibbon.brands.length]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-brand-card]");
    const step = card ? card.offsetWidth + 14 : el.clientWidth * 0.4;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (!brandRibbon.enabled || brandRibbon.brands.length === 0) return null;

  const brands = brandRibbon.brands;
  const marqueeBrands = [
    ...brands.map((brand) => ({ brand, duplicate: false })),
    ...brands.map((brand) => ({ brand, duplicate: true })),
  ];
  const heading = lang === "hi" ? brandRibbon.headingHi : brandRibbon.heading;

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
          <div className="flex items-center justify-center gap-2.5">
            <Flourish />
            <p className="eyebrow text-[10px] font-semibold tracking-[0.24em] text-maroon sm:text-[11px]">
              {t("Trusted by India's finest", "भारत के बेहतरीन ब्रांड्स का भरोसा")}
            </p>
            <Flourish flip />
          </div>
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

        <div
          className="relative mt-8 rounded-2xl border border-maroon/10 bg-white/70 px-6 py-5 shadow-[0_18px_50px_-35px_rgba(185,32,37,0.45)] backdrop-blur-sm sm:mt-10 sm:px-12"
          onMouseEnter={() => {
            autoPausedRef.current = true;
          }}
          onMouseLeave={() => {
            autoPausedRef.current = false;
          }}
          onFocusCapture={() => {
            autoPausedRef.current = true;
          }}
          onBlurCapture={() => {
            autoPausedRef.current = false;
          }}
          onTouchStart={() => {
            autoPausedRef.current = true;
          }}
          onTouchEnd={() => {
            autoPausedRef.current = false;
          }}
        >
          <NavArrow
            direction="prev"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            label={t("Previous brands", "पिछले ब्रांड")}
          />
          <NavArrow
            direction="next"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            label={t("Next brands", "अगले ब्रांड")}
          />

          <span
            aria-hidden
            className="pointer-events-none absolute bottom-5 left-6 top-5 z-[5] w-7 bg-gradient-to-r from-white/90 to-transparent sm:left-12"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-5 right-6 top-5 z-[5] w-7 bg-gradient-to-l from-white/90 to-transparent sm:right-12"
          />

          <ul
            ref={trackRef}
            className="no-scrollbar flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto scroll-smooth pb-1"
          >
            {marqueeBrands.map(({ brand, duplicate }, index) => {
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
                  key={`${brand.id}-${duplicate ? "duplicate" : "original"}`}
                  data-brand-card
                  data-loop-start={
                    index === brands.length ? "true" : undefined
                  }
                  aria-hidden={duplicate || undefined}
                  className="h-[8.75rem] w-[35vw] max-w-[7.5rem] shrink-0 snap-start sm:w-[7.25rem] sm:max-w-none lg:w-[7.5rem]"
                >
                  <Link
                    href={`/vendors?q=${encodeURIComponent(brand.name)}`}
                    tabIndex={duplicate ? -1 : undefined}
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
                        {meta || "\u00A0"}
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
                            "\u00A0"
                          )}
                        </span>
                        <span className="shrink-0 font-medium text-ink/70">
                          {years > 0
                            ? t(`${years}+ Years`, `${years}+ वर्ष`)
                            : "\u00A0"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}

            <li
              data-brand-card
              className="h-[8.75rem] w-[35vw] max-w-[7.5rem] shrink-0 snap-start sm:w-[7.25rem] sm:max-w-none lg:w-[7.5rem]"
            >
              <Link
                href="/vendors"
                className="group flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed border-maroon/25 bg-cream/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-maroon/45 hover:bg-cream/70 active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-full bg-maroon text-cream transition-transform duration-200 group-hover:scale-105"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    className="h-2.5 w-2.5"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
                <span className="px-1.5 text-center text-[8px] font-semibold tracking-wide text-maroon">
                  {t("Explore more", "और देखें")}
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
