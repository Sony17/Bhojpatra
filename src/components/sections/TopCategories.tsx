"use client";

import Image from "next/image";
import Link from "next/link";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

// Maps a service category to a pre-filtered vendor-catalog deep-link.
const CATEGORY_HREF: Record<string, string> = {
  caterers: "/vendors",
  "live-counters": "/vendors?meal=Live+Counters",
  sweets: "/vendors?cuisine=Sweets",
  chaat: "/vendors?cuisine=Chaat",
  beverages: "/vendors?cuisine=Beverages",
  decor: "/vendors?cuisine=Decor",
};

function serviceCategoryHref(id: string, name: string): string {
  return CATEGORY_HREF[id] ?? `/vendors?q=${encodeURIComponent(name)}`;
}

/**
 * Category rail under "Single stall, one Bhojpatra Experience…" —
 * large occasion-style portrait tiles in a continuous right→left marquee.
 */
export default function TopCategories() {
  const { lang, t } = useLang();
  const { services } = useHomeContent();

  const showPrices = services.showPrices;
  const serviceCards = services.categories.map((c) => ({
    id: c.id,
    name: lang === "hi" ? c.nameHi : c.name,
    image: c.image,
    href: serviceCategoryHref(c.id, c.name),
    priceFrom: c.priceFrom ?? "",
  }));
  const bainaCard = {
    id: services.bainaBox.id,
    name: lang === "hi" ? services.bainaBox.nameHi : services.bainaBox.name,
    image: services.bainaBox.image,
    href: "/vendors?q=Baina+Box",
    priceFrom: services.bainaBox.priceFrom ?? "",
  };
  const mid = Math.floor(serviceCards.length / 2);
  const cards = [
    ...serviceCards.slice(0, mid),
    bainaCard,
    ...serviceCards.slice(mid),
  ];

  return (
    <section
      id="services"
      className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <SectionIntro
        eyebrow={t("What's on your mind?", "क्या मन है?")}
        title={lang === "hi" ? services.headingHi : services.heading}
        subtitle={lang === "hi" ? services.subtitleHi : services.subtitle}
      />

      <div className="marquee-pause relative -mx-5 mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] sm:-mx-8 sm:mt-10">
        <div className="animate-marquee flex w-max gap-3 px-5 py-1 motion-reduce:!animate-none sm:gap-4 sm:px-8">
          {[0, 1].map((copy) =>
            cards.map((card) => (
              <Link
                key={`${card.id}-${copy}`}
                href={card.href}
                aria-label={copy === 0 ? card.name : undefined}
                aria-hidden={copy === 1 || undefined}
                tabIndex={copy === 1 ? -1 : undefined}
                className="group relative w-[9.5rem] shrink-0 overflow-hidden rounded-2xl shadow-card ring-1 ring-maroon/8 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:w-[11rem]"
              >
                <span className="relative block aspect-[3/4] w-full bg-cream">
                  <Image
                    src={card.image}
                    alt={copy === 0 ? card.name : ""}
                    fill
                    sizes="176px"
                    className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                    unoptimized={isUnoptimized(card.image)}
                  />
                  <span aria-hidden className="absolute inset-0 bg-black/45" />
                  <span className="media-veil absolute inset-0" />
                  <span className="absolute inset-x-0 bottom-0 px-3 pb-3.5">
                    <span className="block font-sans text-[14px] font-bold leading-tight text-cream sm:text-[15px]">
                      {card.name}
                    </span>
                    {showPrices && card.priceFrom ? (
                      <span className="mt-1 block text-[11px] font-medium text-cream/85">
                        {lang === "hi"
                          ? `${card.priceFrom} से`
                          : `From ${card.priceFrom}`}
                      </span>
                    ) : (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
                        {t("Explore", "देखें")}
                        <span aria-hidden>→</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            )),
          )}
        </div>
      </div>
    </section>
  );
}
