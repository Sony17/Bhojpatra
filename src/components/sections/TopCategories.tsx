"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

export default function TopCategories() {
  const { lang, t } = useLang();
  const { services } = useHomeContent();
  const [expanded, setExpanded] = useState(false);

  const total = services.categories.length;
  // Cards match the small "moments when we set tables" size: 6 per row on
  // desktop, 3 on mobile. Collapsed view shows one row on desktop (6) and two
  // rows on mobile (3-col).
  const hasMore = total > 6; // more than the collapsed row(s) on any breakpoint
  const showToggle = hasMore;

  // When collapsed, hide everything past the first row so the grid stays at one
  // row on desktop (6-col) and two rows on mobile (3-col).
  const collapsedHidden = (index: number) => {
    if (expanded || index < 6) return "";
    return "hidden"; // beyond the first row on every breakpoint
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="text-center">
        <h2 className="font-display text-3xl text-maroon sm:text-4xl">
          {lang === "hi" ? services.headingHi : services.heading}
        </h2>
        <p className="font-script mx-auto mt-4 max-w-2xl text-xl text-ink-soft sm:text-2xl">
          {lang === "hi" ? services.subtitleHi : services.subtitle}
        </p>
      </Reveal>

      <Reveal
        as="ul"
        stagger
        className="mt-12 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-6 lg:grid-cols-6"
      >
        {services.categories.map((category, index) => (
          <li key={category.id} className={collapsedHidden(index)}>
            <button
              type="button"
              className="group relative block aspect-[9/10] h-full w-full overflow-hidden rounded-xl ring-1 ring-cream-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Full-card photo */}
              {category.image && (
                <Image
                  src={category.image}
                  alt={lang === "hi" ? category.nameHi : category.name}
                  fill
                  sizes="(min-width: 1024px) 200px, (min-width: 640px) 22vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={isUnoptimized(category.image)}
                />
              )}

              {/* Overlay — strong dark backing at the bottom so the label reads
                  on any photo, even at this small card size; deepens on hover */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent opacity-95 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Text over the overlay */}
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3 text-center">
                <span className="font-sans text-sm font-semibold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
                  {lang === "hi" ? category.nameHi : category.name}
                </span>
                <span className="translate-y-1 text-[11px] font-medium text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {t("Explore →", "देखें →")}
                </span>
              </span>
            </button>
          </li>
        ))}
      </Reveal>

      {showToggle && (
        <Reveal variant="fade" delay={120} className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="btn-sheen rounded-full bg-maroon px-8 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-dark hover:shadow-lg active:scale-95"
          >
            {expanded
              ? t("Show Less", "कम दिखाएं")
              : lang === "hi"
                ? services.ctaHi
                : services.cta}
          </button>
        </Reveal>
      )}
      </div>
    </section>
  );
}
