"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { planningOccasions, type PlanningOccasion } from "@/lib/data";
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

export default function PlanningFor() {
  const [selected, setSelected] = useState<string>(planningOccasions[0].id);
  const selectedOccasion =
    planningOccasions.find((o) => o.id === selected) ?? planningOccasions[0];

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
      <div className="mx-auto flex min-h-[560px] max-w-7xl flex-col justify-between px-5 py-12 sm:min-h-[620px] sm:py-14">
        {/* Ribbon — label + stamped occasion pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <span className="eyebrow mr-1 text-xs font-semibold text-cream/80 sm:text-[13px]">
            Planning For
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
                <span className="whitespace-nowrap">{o.name}</span>
              </button>
            );
          })}
        </div>

        {/* Caption — re-keyed on selection so the text re-animates in */}
        <div
          key={selectedOccasion.id}
          className="animate-fade mt-10 flex max-w-xl flex-col items-start gap-3 text-cream"
        >
          <h2 className="text-2xl font-semibold tracking-wide sm:text-3xl lg:text-4xl">
            {selectedOccasion.name}
          </h2>
          <p className="text-sm text-cream/85 sm:text-base">
            {selectedOccasion.tagline}
          </p>
          <Link
            href="/book"
            className="btn-sheen group mt-2 inline-flex items-center gap-1.5 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon/90 active:scale-95"
          >
            Start planning
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
