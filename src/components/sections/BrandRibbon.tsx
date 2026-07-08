"use client";

import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/**
 * A refined, editorial "trusted by" band — the prestigious / famous brands
 * Bhojpatra serves, drifting past in one continuous line. Sits just above the
 * footer sitewide, between the "Mobile App Coming Soon" promo and the footer
 * links. Fully admin-managed (enable toggle, heading and the brand list) via
 * Admin → Content Control → Home Page → Brand Ribbon.
 *
 * The track holds two identical copies of the list; the `bp-marquee` keyframe
 * shifts it by -50% so the loop lands seamlessly on the second copy. It pauses
 * on hover and — because `.animate-marquee` only exists under
 * `prefers-reduced-motion: no-preference` — sits still for reduced-motion users.
 */
export default function BrandRibbon() {
  const { lang } = useLang();
  const { brandRibbon } = useHomeContent();

  if (!brandRibbon.enabled || brandRibbon.brands.length === 0) return null;

  const brands = brandRibbon.brands;
  const heading = lang === "hi" ? brandRibbon.headingHi : brandRibbon.heading;

  return (
    <section className="border-t border-maroon/10 bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-12">
        {heading && (
          <p className="eyebrow mb-8 text-center text-xs font-semibold text-maroon sm:text-sm">
            {heading}
          </p>
        )}

        {/* Ribbon — edges fade via the mask; pauses on hover. */}
        <div className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
          <ul className="animate-marquee flex w-max items-center">
            {[...brands, ...brands].map((brand, i) => {
              const name = lang === "hi" ? brand.nameHi : brand.name;
              // Only the first copy is announced; the duplicate is decorative.
              const original = i < brands.length;
              return (
                <li
                  key={`${brand.id}-${i}`}
                  aria-hidden={original ? undefined : true}
                  className="flex shrink-0 items-center"
                >
                  <span className="flex items-center gap-3 px-7 sm:px-10">
                    {brand.logo && (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-maroon/15">
                        <Image
                          src={brand.logo}
                          alt={original ? name : ""}
                          fill
                          sizes="40px"
                          className="object-contain"
                          unoptimized={isUnoptimized(brand.logo)}
                        />
                      </span>
                    )}
                    <span className="whitespace-nowrap text-base font-semibold tracking-wide text-ink sm:text-lg">
                      {name}
                    </span>
                  </span>
                  {/* Elegant separator between brands. */}
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-maroon"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
