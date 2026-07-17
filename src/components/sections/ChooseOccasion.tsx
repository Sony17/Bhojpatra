"use client";

import Image from "next/image";
import Link from "next/link";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

/**
 * First section under the hero — no scroll-reveal so the handoff feels
 * instant while scrolling (food-app velocity).
 */
export default function ChooseOccasion() {
  const { lang, t } = useLang();
  const { occasions } = useHomeContent();

  return (
    <section
      id="occasions"
      className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <SectionIntro
        eyebrow={t("Occasions", "अवसर")}
        title={lang === "hi" ? occasions.headingHi : occasions.heading}
        subtitle={lang === "hi" ? occasions.subtitleHi : occasions.subtitle}
      />

      <div className="marquee-pause relative -mx-5 mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] sm:-mx-8 sm:mt-10">
        <div className="animate-marquee flex w-max gap-3 px-5 py-1 motion-reduce:!animate-none sm:gap-4 sm:px-8">
          {[0, 1].map((copy) =>
            occasions.items.map((occasion) => {
              const name = lang === "hi" ? occasion.nameHi : occasion.name;
              return (
                <Link
                  key={`${occasion.id}-${copy}`}
                  href={`/book?occasion=${occasion.id}`}
                  aria-label={copy === 0 ? `Book — ${name}` : undefined}
                  aria-hidden={copy === 1 || undefined}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="group relative w-[9.5rem] shrink-0 overflow-hidden rounded-2xl shadow-card ring-1 ring-maroon/8 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:w-[11rem]"
                >
                  <span className="relative block aspect-[3/4] w-full">
                    <Image
                      src={occasion.image}
                      alt={copy === 0 ? name : ""}
                      fill
                      sizes="176px"
                      className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                      unoptimized={isUnoptimized(occasion.image)}
                    />
                    <span aria-hidden className="absolute inset-0 bg-black/45" />
                    <span className="media-veil absolute inset-0" />
                    <span className="absolute inset-x-0 bottom-0 px-3 pb-3.5">
                      <span className="block font-sans text-[14px] font-bold leading-tight text-cream sm:text-[15px]">
                        {name}
                      </span>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
                        {t("Book", "बुक")}
                        <span aria-hidden>→</span>
                      </span>
                    </span>
                  </span>
                </Link>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}
