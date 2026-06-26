"use client";

import { useState } from "react";
import Image from "next/image";
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

  return (
    <section className="bg-cream-2/70">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-12">
        {/* Ribbon — label + stamped occasion pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <span className="eyebrow mr-1 text-xs font-semibold text-ink-soft sm:text-[13px]">
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
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 sm:px-5 sm:py-2.5 " +
                  (active
                    ? "bg-maroon text-cream shadow-[0_8px_20px_-8px_rgba(185,32,37,0.6)]"
                    : "bg-white text-ink ring-1 ring-black/[0.07] hover:ring-maroon/40 hover:text-maroon")
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">{o.name}</span>
              </button>
            );
          })}
        </div>

        {/* Below the ribbon — a round photo of every occasion, the selected one
            lifted and ringed in brand red. */}
        <ul className="mt-8 flex flex-wrap items-start justify-center gap-x-5 gap-y-6 sm:mt-9 sm:gap-x-8">
          {planningOccasions.map((o: PlanningOccasion) => {
            const active = o.id === selected;
            return (
              <li key={o.id} className="w-[88px] sm:w-[104px]">
                <button
                  type="button"
                  onClick={() => setSelected(o.id)}
                  aria-pressed={active}
                  aria-label={o.name}
                  className="flex w-full flex-col items-center gap-2.5 outline-none"
                >
                  <span
                    className={
                      "relative block aspect-square w-16 overflow-hidden rounded-full ring-offset-2 ring-offset-cream-2 transition duration-300 sm:w-20 " +
                      (active
                        ? "scale-110 ring-2 ring-maroon shadow-[0_12px_26px_-12px_rgba(185,32,37,0.7)]"
                        : "ring-1 ring-black/10 hover:ring-maroon/50")
                    }
                  >
                    <Image
                      src={o.image}
                      alt={o.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    {!active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-white/35 transition-opacity duration-300 hover:opacity-0"
                      />
                    )}
                  </span>
                  <span
                    className={
                      "text-center text-xs font-medium leading-tight transition-colors sm:text-[13px] " +
                      (active ? "text-maroon" : "text-ink-soft")
                    }
                  >
                    {o.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
