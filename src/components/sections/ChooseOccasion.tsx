"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

export default function ChooseOccasion() {
  const { lang } = useLang();
  const { occasions } = useHomeContent();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    if (cards.length < 2) return;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const index = Math.round(track.scrollLeft / step);
    setActive(Math.min(cards.length - 1, Math.max(0, index)));
  };

  const scrollToCard = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const card = cards[index];
    if (!card) return;
    track.scrollTo({
      left: card.offsetLeft - cards[0].offsetLeft,
      behavior: "smooth",
    });
  };

  // Prev/next arrows nudge the strip by two cards to reveal more images.
  const nudge = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    if (cards.length < 2) return;
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    track.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section
      id="occasions"
      className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20"
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
        <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto sm:gap-6"
          aria-label="Occasions"
        >
          {occasions.items.map((occasion) => {
            const name = lang === "hi" ? occasion.nameHi : occasion.name;
            return (
            <div
              key={occasion.id}
              className="group relative w-[36vw] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[22.5%] lg:w-[calc((100%-6rem)/5)]"
            >
              {/* Tapping an occasion opens the booking wizard with that
                  occasion pre-selected (the wizard reads `?occasion=`). */}
              <Link
                href={`/book?occasion=${occasion.id}`}
                aria-label={`Book — ${name}`}
                className="relative block aspect-[9/10] w-full"
              >
                <Image
                  src={occasion.image}
                  alt={name}
                  fill
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 22.5vw, 36vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  unoptimized={isUnoptimized(occasion.image)}
                />
                {/* Darken so the name reads on the photo, like the reference */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
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

          {/* Prev / next arrows — nudge the strip to reveal more images. */}
          <button
            type="button"
            aria-label="Show previous images"
            onClick={() => nudge(-1)}
            className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-maroon/15 bg-white text-maroon shadow-md transition-colors hover:bg-maroon hover:text-cream sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Show more images"
            onClick={() => nudge(1)}
            className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-maroon/15 bg-white text-maroon shadow-md transition-colors hover:bg-maroon hover:text-cream sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Dot pagination — the mobile/tablet swipe affordance. Hidden on the
            web/desktop layout, where every card is visible in the row. */}
        <div className="mt-8 flex items-center justify-center gap-2.5 lg:hidden">
          {occasions.items.map((occasion, index: number) => (
            <button
              key={occasion.id}
              type="button"
              aria-label={`Go to ${lang === "hi" ? occasion.nameHi : occasion.name}`}
              aria-current={index === active}
              onClick={() => scrollToCard(index)}
              className={
                "flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200 " +
                (index === active ? "border-black" : "border-transparent")
              }
            >
              <span className="h-2 w-2 rounded-full bg-maroon" />
            </button>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
