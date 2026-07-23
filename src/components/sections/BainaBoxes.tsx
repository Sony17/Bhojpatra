"use client";

import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import { getBainaBoxVendor } from "@/lib/bainaBoxData";

/** First letter of the first two words — fallback brand mark when no logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Baina box brands band — photo-led editorial split under Services.
 */
export default function BainaBoxes() {
  const { lang } = useLang();
  const { bainaBoxes, bainaBoxSpecial, promo } = useHomeContent();
  const brands = bainaBoxes.brands;
  const atmosphere =
    bainaBoxSpecial.image || promo.image || brands[0]?.image || "";

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-card sm:rounded-[1.5rem]">
            {/* Full-bleed atmosphere — gift / feast photography */}
            {atmosphere ? (
              <div className="absolute inset-0">
                <Image
                  src={atmosphere}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1280px) 1280px, 100vw"
                  className="object-cover object-center"
                  unoptimized={isUnoptimized(atmosphere)}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-cream via-cream/92 to-cream/50"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-cream/90 via-transparent to-cream/40 lg:hidden"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-cream" />
            )}

            <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] lg:items-center lg:gap-8 lg:px-10 lg:py-10">
              <div className="relative text-center lg:text-left">
                <h2 className="font-display text-title leading-tight text-ink">
                  <span className="block">
                    {lang === "hi" ? bainaBoxes.headingHi : bainaBoxes.heading}
                  </span>
                  <span className="mt-1 block text-maroon">
                    {lang === "hi"
                      ? bainaBoxes.headingEmHi
                      : bainaBoxes.headingEm}
                  </span>
                </h2>
                <p className="font-script mx-auto mt-3 max-w-sm text-subtitle text-ink/70 lg:mx-0">
                  {lang === "hi" ? bainaBoxes.subtitleHi : bainaBoxes.subtitle}
                </p>
                <Button
                  href="/baina-box"
                  variant="secondary"
                  size="md"
                  className="btn-sheen mt-5 rounded-full px-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop"
                >
                  {lang === "hi" ? bainaBoxes.ctaHi : bainaBoxes.cta}
                </Button>
              </div>

              <Reveal
                as="ul"
                stagger
                className="relative mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-8 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0 lg:mt-0 lg:gap-5 [&::-webkit-scrollbar]:hidden"
              >
                {brands.map((brand) => {
                  const vendorData = getBainaBoxVendor(brand.id);
                  const cardContent = (
                    <>
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card bg-white shadow-pop ring-1 ring-maroon/10 transition duration-500 hover:-translate-y-1 hover:shadow-brand">
                        <Image
                          src={brand.image}
                          alt={lang === "hi" ? brand.nameHi : brand.name}
                          fill
                          sizes="(min-width: 1024px) 220px, (min-width: 640px) 22vw, 192px"
                          className="object-cover transition-transform duration-700 hover:scale-105"
                          unoptimized={isUnoptimized(brand.image)}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 text-center lg:justify-start">
                        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[9px] font-bold text-maroon ring-1 ring-maroon/25">
                          {brand.logo ? (
                            <Image
                              src={brand.logo}
                              alt={lang === "hi" ? brand.nameHi : brand.name}
                              fill
                              sizes="28px"
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
                    </>
                  );

                  return (
                    <li
                      key={brand.id}
                      className="flex w-48 shrink-0 snap-start flex-col gap-2.5 sm:w-auto"
                    >
                      {vendorData ? (
                        <Link
                          href={`/baina-box/${brand.id}`}
                          className="group flex flex-col gap-2.5"
                        >
                          {cardContent}
                        </Link>
                      ) : (
                        cardContent
                      )}
                    </li>
                  );
                })}
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
