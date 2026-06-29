"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { planningOccasions, type PlanningOccasion, type TrendingDish } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import {
  Sparkle,
  Rings,
  Briefcase,
  Gift,
  Lantern,
  HomeIcon,
  Diya,
} from "@/components/icons";

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;

const planningIcons: Record<string, IconComponent> = {
  sparkle: Sparkle,
  rings: Rings,
  briefcase: Briefcase,
  gift: Gift,
  lantern: Lantern,
  home: HomeIcon,
  diya: Diya,
};

const tagHi: Record<string, string> = {
  Bestseller: "बेस्टसेलर",
  "Most Loved": "सबसे पसंदीदा",
  Trending: "ट्रेंडिंग",
  "Sweet Pick": "मिठाई",
  "Crowd Fav": "भीड़ की पसंद",
  "Quick Bite": "झटपट",
};

export default function PlanningFor() {
  const { lang, t } = useLang();
  const [selected, setSelected] = useState<string>(planningOccasions[0].id);
  const selectedOccasion =
    planningOccasions.find((o) => o.id === selected) ?? planningOccasions[0];
  const selectedName =
    lang === "hi" ? selectedOccasion.nameHi : selectedOccasion.name;

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      {/* Full-bleed backdrop — every occasion image is stacked and only the
          selected one is faded in, so clicking a pill crossfades the entire
          section's background. */}
      {planningOccasions.map((o: PlanningOccasion) => {
        const active = o.id === selected;
        return (
          <Image
            key={o.id}
            src={o.image}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority={o.id === planningOccasions[0].id}
            className={
              "-z-10 object-cover transition-all duration-[1200ms] ease-out " +
              (active ? "scale-100 opacity-100" : "scale-105 opacity-0")
            }
          />
        );
      })}

      {/* Scrim for legibility over any photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/45"
      />

      {/* Content */}
      <div className="flex min-h-[560px] flex-col justify-between py-12 sm:min-h-[680px] sm:py-14">
        {/* Ribbon — label + stamped occasion pills */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2.5 px-5 sm:gap-3">
          <span className="eyebrow mr-1 w-full whitespace-nowrap text-center text-xs font-semibold text-cream/80 sm:w-auto sm:text-[13px]">
            {t("Planning For", "किसके लिए प्लान कर रहे हैं")}
          </span>

          {planningOccasions.map((o: PlanningOccasion) => {
            const Icon = planningIcons[o.iconKey];
            const active = o.id === selected;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o.id)}
                aria-pressed={active}
                className={
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all duration-300 sm:px-5 sm:py-2.5 " +
                  (active
                    ? "scale-105 bg-maroon text-cream shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)]"
                    : "bg-white/15 text-cream ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/25 hover:ring-white/50")
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">{lang === "hi" ? o.nameHi : o.name}</span>
              </button>
            );
          })}
        </div>

        {/* Trending dishes — five crowd-favourites for the selected occasion,
            re-keyed on selection so the whole strip crossfades in. Full-bleed:
            the strip spans the entire viewport width, not the content column. */}
        <div key={`trending-${selectedOccasion.id}`} className="animate-fade my-12 w-full">
          {/* Legible, decorated label — solid cream with rule lines either side */}
          <div className="mb-7 flex items-center justify-center gap-4 px-5">
            <span aria-hidden="true" className="h-px w-10 bg-gradient-to-r from-transparent to-cream/60 sm:w-16" />
            <p className="eyebrow text-center text-xs font-bold uppercase tracking-[0.28em] text-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-sm">
              {t("Trending for ", "ट्रेंडिंग — ")}
              {selectedName}
            </p>
            <span aria-hidden="true" className="h-px w-10 bg-gradient-to-l from-transparent to-cream/60 sm:w-16" />
          </div>
          <ul className="flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:gap-6 sm:overflow-visible sm:px-8 lg:px-12">
            {selectedOccasion.trending.map((dish: TrendingDish) => (
              <li
                key={dish.name}
                className="group flex w-40 shrink-0 snap-start flex-col items-center gap-3 rounded-3xl bg-white/10 p-4 text-center ring-1 ring-white/15 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/[0.18] hover:ring-cream/50 sm:w-auto sm:flex-1 sm:p-5"
              >
                <span className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-cream/40 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.85)] transition-shadow duration-300 group-hover:ring-cream/70 sm:h-32 sm:w-32">
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="(min-width: 640px) 128px, 96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-tight text-cream drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:text-base">
                  {dish.name}
                </span>
                <span className="rounded-full bg-maroon px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-[0_4px_12px_-4px_rgba(0,0,0,0.7)] sm:text-[11px]">
                  {lang === "hi" ? tagHi[dish.tag] ?? dish.tag : dish.tag}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Caption — re-keyed on selection so the text re-animates in */}
        <div
          key={selectedOccasion.id}
          className="animate-fade mx-auto mt-10 flex w-full max-w-7xl flex-col items-start gap-3 px-5 text-cream"
        >
          <h2 className="text-2xl font-semibold tracking-wide sm:text-3xl lg:text-4xl">
            {selectedName}
          </h2>
          <p className="max-w-xl text-sm text-cream/85 sm:text-base">
            {lang === "hi" ? selectedOccasion.taglineHi : selectedOccasion.tagline}
          </p>
          <Link
            href="/book"
            className="btn-sheen group mt-2 inline-flex items-center gap-1.5 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon/90 active:scale-95"
          >
            {t("Start planning", "प्लानिंग शुरू करें")}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
