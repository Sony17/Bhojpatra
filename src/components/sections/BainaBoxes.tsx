"use client";

import { useMemo } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import type { HomeBrand } from "@/lib/homeContentData";

/** First letter of the first two words — fallback brand mark when no logo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Bhojpatra packaging story card — not a sweet-house brand; keep it centered in the desktop row. */
function isPremiumPackagingBrand(brand: HomeBrand): boolean {
  return (
    brand.id === "premium-packaging" ||
    brand.name.trim().toLowerCase() === "premium packaging"
  );
}

/** sm+ grid order (1-based) so Premium Packaging sits in the middle column(s). */
function premiumPackagingSmOrder(brands: HomeBrand[]): Map<string, number> | null {
  const from = brands.findIndex(isPremiumPackagingBrand);
  if (from === -1 || brands.length < 2) return null;
  const target = Math.floor(brands.length / 2);
  if (from === target) return null;

  const reordered = [...brands];
  const [card] = reordered.splice(from, 1);
  reordered.splice(target, 0, card);

  const order = new Map<string, number>();
  reordered.forEach((b, i) => order.set(b.id, i + 1));
  return order;
}

const SM_ORDER_CLASS: Record<number, string> = {
  1: "sm:order-1",
  2: "sm:order-2",
  3: "sm:order-3",
  4: "sm:order-4",
  5: "sm:order-5",
  6: "sm:order-6",
  7: "sm:order-7",
  8: "sm:order-8",
};

/** Equal-width columns that span the card row — avoids empty trailing columns when count < 4. */
function brandCardsGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 justify-items-center";
  if (count === 2) return "grid-cols-2 sm:justify-items-center";
  if (count === 3) return "grid-cols-3 sm:justify-items-center";
  return "grid-cols-2 sm:grid-cols-4 sm:justify-items-center";
}

/**
 * Baina box brands band — stacked on mobile; copy | cards split on lg+.
 */
export default function BainaBoxes() {
  const { lang } = useLang();
  const { bainaBoxes, bainaBoxSpecial, promo } = useHomeContent();
  const brands = bainaBoxes.brands;
  const packagingSmOrder = useMemo(
    () => premiumPackagingSmOrder(brands),
    [brands],
  );
  const atmosphere =
    bainaBoxSpecial.image || promo.image || brands[0]?.image || "";

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-8">
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
                  className="absolute inset-0 bg-gradient-to-b from-cream/95 via-cream/88 to-cream/82 lg:bg-gradient-to-r lg:from-cream/96 lg:via-cream/91 lg:to-cream/78"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_40%,transparent_0%,rgba(240,208,158,0.45)_100%)] lg:bg-[radial-gradient(ellipse_90%_120%_at_72%_50%,transparent_0%,rgba(240,208,158,0.35)_100%)]"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-cream" />
            )}

            <div
              className={
                "relative flex flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10 lg:py-5" +
                (brands.length > 0
                  ? " lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-10 lg:text-left xl:gap-12 xl:px-12"
                  : " lg:px-8")
              }
            >
              <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-[18rem] lg:justify-self-end lg:text-left">
                <h2 className="font-display text-title leading-tight text-ink lg:text-[1.65rem] lg:leading-[1.12]">
                  <span className="block">
                    {lang === "hi" ? bainaBoxes.headingHi : bainaBoxes.heading}
                  </span>
                  <span className="mt-1 block text-maroon lg:mt-0.5">
                    {lang === "hi"
                      ? bainaBoxes.headingEmHi
                      : bainaBoxes.headingEm}
                  </span>
                </h2>
                <p className="font-script mx-auto mt-3 max-w-md text-subtitle leading-relaxed text-ink/70 lg:mx-0 lg:mt-2 lg:max-w-sm lg:text-base lg:leading-snug">
                  {lang === "hi" ? bainaBoxes.subtitleHi : bainaBoxes.subtitle}
                </p>
                <div className="mt-5 flex justify-center sm:mt-6 lg:mt-3 lg:justify-start">
                  <Button
                    href="/baina-box"
                    variant="secondary"
                    size="md"
                    className="btn-sheen rounded-full px-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop lg:min-h-10 lg:px-5 lg:py-2 lg:text-xs"
                  >
                    {lang === "hi" ? bainaBoxes.ctaHi : bainaBoxes.cta}
                  </Button>
                </div>
              </div>

              {brands.length > 0 && (
                <Reveal
                  as="ul"
                  stagger
                  className={
                    "relative mt-8 grid w-full min-w-0 max-w-4xl gap-4 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-6 lg:mt-0 lg:max-w-none lg:flex lg:justify-center lg:gap-x-3 lg:gap-y-3 lg:justify-self-start " +
                    brandCardsGridClass(brands.length)
                  }
                >
                  {brands.map((brand) => {
                    const smOrder = packagingSmOrder?.get(brand.id);
                    const smOrderClass =
                      smOrder !== undefined ? SM_ORDER_CLASS[smOrder] : "";
                    return (
                    <li
                      key={brand.id}
                      className={
                        "flex w-full min-w-0 max-w-[11.5rem] flex-col gap-2.5 justify-self-center sm:w-48 sm:max-w-[12rem] sm:shrink-0 lg:w-[8.75rem] lg:max-w-[8.75rem] lg:gap-1.5" +
                        (smOrderClass ? ` ${smOrderClass}` : "")
                      }
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card bg-white shadow-pop ring-1 ring-maroon/10 transition duration-500 hover:-translate-y-1 hover:shadow-brand">
                        <Image
                          src={brand.image}
                          alt={lang === "hi" ? brand.nameHi : brand.name}
                          fill
                          sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 192px"
                          className="object-cover transition-transform duration-700 hover:scale-105"
                          unoptimized={isUnoptimized(brand.image)}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 text-center">
                        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[9px] font-bold text-maroon ring-1 ring-maroon/25 lg:h-6 lg:w-6">
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
                        <span className="text-sm font-semibold leading-snug text-ink lg:text-xs">
                          {lang === "hi" ? brand.nameHi : brand.name}
                        </span>
                      </div>
                    </li>
                    );
                  })}
                </Reveal>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
