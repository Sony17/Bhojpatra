"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/** First letter of the first two words, uppercased — the fallback brand mark
 *  shown in the circle when a brand has no uploaded logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * "Celebrate with Sweetness & Love" — a cream promo band under Services
 * showcasing premium baina boxes from famous brands. All copy, the CTA label
 * and the brand cards (name, logo, image) are admin-editable via
 * Admin → Content Control → Home Page → Baina Box Brands.
 */
export default function BainaBoxes() {
  const { lang } = useLang();
  const { bainaBoxes } = useHomeContent();
  const brands = bainaBoxes.brands;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 sm:px-8">
        <Reveal variant="scale">
          <div className="grid items-center gap-10 rounded-card bg-cream/40 p-8 ring-1 ring-cream sm:p-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            {/* Left — heading, lede, CTA */}
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
                <span className="block">
                  {lang === "hi" ? bainaBoxes.headingHi : bainaBoxes.heading}
                </span>
                <span className="mt-1 block text-maroon">
                  {lang === "hi" ? bainaBoxes.headingEmHi : bainaBoxes.headingEm}
                </span>
              </h2>
              <p className="font-script mx-auto mt-4 max-w-sm text-lg text-ink-soft lg:mx-0">
                {lang === "hi" ? bainaBoxes.subtitleHi : bainaBoxes.subtitle}
              </p>
              <Button
                href="/vendors?q=Baina+Box"
                variant="secondary"
                size="lg"
                className="btn-sheen mt-8 rounded-full px-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop"
              >
                {lang === "hi" ? bainaBoxes.ctaHi : bainaBoxes.cta}
              </Button>
            </div>

            {/* Right — brand boxes. On mobile they sit in a single scrollable
                row (one line); from sm up they lay out as a 4-up grid. */}
            <Reveal
              as="ul"
              stagger
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              {brands.map((brand) => (
                <li
                  key={brand.id}
                  className="flex w-32 shrink-0 snap-start flex-col items-center gap-3 sm:w-auto"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-card ring-1 ring-cream shadow-card transition duration-300 hover:shadow-pop">
                    <Image
                      src={brand.image}
                      alt={lang === "hi" ? brand.nameHi : brand.name}
                      fill
                      sizes="(min-width: 1024px) 150px, (min-width: 640px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      unoptimized={isUnoptimized(brand.image)}
                    />
                  </div>
                  <div className="flex min-h-10 w-full items-center justify-center gap-2 text-center">
                    <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-bold text-maroon ring-1 ring-maroon/40">
                      {brand.logo ? (
                        <Image
                          src={brand.logo}
                          alt={lang === "hi" ? brand.nameHi : brand.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                          unoptimized={isUnoptimized(brand.logo)}
                        />
                      ) : (
                        initials(brand.name)
                      )}
                    </span>
                    <span className="text-sm font-semibold leading-snug text-ink">
                      {lang === "hi" ? brand.nameHi : brand.name}
                    </span>
                  </div>
                </li>
              ))}
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
