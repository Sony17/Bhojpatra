"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

export default function ChooseOccasion() {
  const { lang } = useLang();
  const { occasions } = useHomeContent();
  // Touch pauses the slide so a card can be tapped; hovering pauses it on
  // desktop via `.marquee-pause`. Auto-resumes on lift.
  const [paused, setPaused] = useState(false);

  return (
    <section
      id="occasions"
      className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <Reveal variant="left" className="text-center">
        <h2 className="font-display text-3xl text-maroon sm:text-4xl">
          {lang === "hi" ? occasions.headingHi : occasions.heading}
        </h2>
        <p className="font-script mx-auto mt-4 max-w-2xl text-[0.9375rem] text-ink-soft sm:text-lg">
          {lang === "hi" ? occasions.subtitleHi : occasions.subtitle}
        </p>
      </Reveal>

      <Reveal as="div" variant="up" className="mt-12">
        {/* Continuous marquee — the occasion cards slide sideways forever;
            hovering (desktop) or touching (mobile) pauses the strip so a card
            can be tapped. The track holds two identical copies, so the -50%
            loop lands seamlessly on the start of the second copy. Motion is
            gated behind `prefers-reduced-motion` by the utility class. */}
        <div
          className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]"
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onTouchCancel={() => setPaused(false)}
        >
          <div
            className="animate-marquee flex w-max gap-4 motion-reduce:!animate-none sm:gap-6"
            style={paused ? { animationPlayState: "paused" } : undefined}
          >
            {[...occasions.items, ...occasions.items].map((occasion, i) => {
              const name = lang === "hi" ? occasion.nameHi : occasion.name;
              const clone = i >= occasions.items.length;
              return (
                <div
                  key={`${occasion.id}-${i}`}
                  aria-hidden={clone}
                  className="group relative w-[42vw] shrink-0 overflow-hidden rounded-card sm:w-[30vw] lg:w-60"
                >
                  {/* Tapping an occasion opens the booking wizard with that
                      occasion pre-selected (the wizard reads `?occasion=`). */}
                  <Link
                    href={`/book?occasion=${occasion.id}`}
                    aria-label={`Book — ${name}`}
                    tabIndex={clone ? -1 : undefined}
                    className="relative block aspect-[9/10] w-full"
                  >
                    <Image
                      src={occasion.image}
                      alt={clone ? "" : name}
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 42vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                      unoptimized={isUnoptimized(occasion.image)}
                    />
                    {/* Black overtone — a full veil for a consistent moody tint,
                        plus a bottom gradient so the name stays legible. */}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 px-3 pb-4 text-center">
                      <span className="font-sans text-sm font-semibold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
                        {name}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
