"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

export default function TopCategories() {
  const { lang } = useLang();
  const { services } = useHomeContent();

  // Continuous-marquee twin of the "moments when we set tables" occasion strip,
  // so the two sections read as a matched pair. Touch pauses the slide so a
  // card can be tapped; hovering pauses it on desktop via `.marquee-pause`.
  const [paused, setPaused] = useState(false);

  // CMS service categories (each opens the booking wizard) with the curated,
  // admin-editable Baina Box card slotted into the middle. Baina Box links to
  // its own catalogue instead of the wizard.
  const serviceCards = services.categories.map((c) => ({
    id: c.id,
    name: lang === "hi" ? c.nameHi : c.name,
    image: c.image,
    href: "/book",
  }));
  const bainaCard = {
    id: services.bainaBox.id,
    name: lang === "hi" ? services.bainaBox.nameHi : services.bainaBox.name,
    image: services.bainaBox.image,
    href: "/vendors?q=Baina+Box",
  };
  const mid = Math.floor(serviceCards.length / 2);
  const cards = [
    ...serviceCards.slice(0, mid),
    bainaCard,
    ...serviceCards.slice(mid),
  ];

  return (
    <section className="bg-white">
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal variant="left" className="text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {lang === "hi" ? services.headingHi : services.heading}
          </h2>
          <p className="font-script mx-auto mt-4 max-w-2xl text-[0.9375rem] text-ink-soft sm:text-lg">
            {lang === "hi" ? services.subtitleHi : services.subtitle}
          </p>
        </Reveal>

        <Reveal as="div" variant="up" className="mt-12">
          {/* Continuous marquee — the service cards slide sideways forever;
              hovering (desktop) or touching (mobile) pauses the strip so a card
              can be tapped. The doubled track makes the -50% loop seamless, and
              the motion is gated behind `prefers-reduced-motion`. */}
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
              {[...cards, ...cards].map((card, i) => {
                const clone = i >= cards.length;
                return (
                  <div
                    key={`${card.id}-${i}`}
                    aria-hidden={clone}
                    className="group relative w-[42vw] shrink-0 overflow-hidden rounded-card sm:w-[30vw] lg:w-60"
                  >
                    {/* Tapping a service card opens the booking wizard — the same
                        "tap a card to begin" gesture as the occasion cards. */}
                    <Link
                      href={card.href}
                      aria-label={card.name}
                      tabIndex={clone ? -1 : undefined}
                      className="relative block aspect-[9/10] w-full"
                    >
                      <Image
                        src={card.image}
                        alt={clone ? "" : card.name}
                        fill
                        sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 42vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        unoptimized={isUnoptimized(card.image)}
                      />
                      {/* Black overtone — a full veil for a consistent moody
                          tint, plus a bottom gradient so the name stays legible. */}
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-3 pb-4 text-center">
                        <span className="font-sans text-sm font-semibold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
                          {card.name}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
