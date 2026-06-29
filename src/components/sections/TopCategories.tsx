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
  // Collapsed view shows one row on desktop (4) and two rows on mobile (4).
  const hasMore = total > 4; // more than the collapsed row(s) on any breakpoint
  const showToggle = hasMore;

  // When collapsed, hide everything past the first row so the grid stays at one
  // row on desktop (4-col) and two rows on mobile (2-col).
  const collapsedHidden = (index: number) => {
    if (expanded || index < 4) return "";
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
        className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-4"
      >
        {services.categories.map((category, index) => (
          <li key={category.id} className={collapsedHidden(index)}>
            <button
              type="button"
              className="group relative block aspect-square h-full w-full overflow-hidden rounded-2xl ring-1 ring-cream-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Full-card photo */}
              {category.image && (
                <Image
                  src={category.image}
                  alt={lang === "hi" ? category.nameHi : category.name}
                  fill
                  sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={isUnoptimized(category.image)}
                />
              )}

              {/* Overlay — subtle by default, deepens on hover */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Text over the overlay */}
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3 text-center">
                <span className="font-display text-sm font-semibold leading-tight text-white sm:text-base">
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
