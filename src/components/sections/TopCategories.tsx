"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";

// Curated Baina Box service — surfaced alongside the CMS service categories and
// pointed at the same baina-box catalogue as the "Sweetness & Love" promo band.
const BAINA_BOX_IMAGE =
  "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=70";

export default function TopCategories() {
  const { lang, t } = useLang();
  const { services } = useHomeContent();

  // Same swipeable carousel + dot pagination as the "moments when we set
  // tables" occasion section, so the two read as twins.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  // The service categories (from the CMS) plus the curated Baina Box card. Each
  // regular service opens the booking wizard; Baina Box opens its catalogue.
  const cards = [
    ...services.categories.map((c) => ({
      id: c.id,
      name: lang === "hi" ? c.nameHi : c.name,
      image: c.image,
      href: "/book",
    })),
    {
      id: "baina-box",
      name: t("Baina Box", "बैना बॉक्स"),
      image: BAINA_BOX_IMAGE,
      href: "/vendors?q=Baina+Box",
    },
  ];

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    if (items.length < 2) return;
    const step = items[1].offsetLeft - items[0].offsetLeft;
    const index = Math.round(track.scrollLeft / step);
    setActive(Math.min(items.length - 1, Math.max(0, index)));
  };

  const scrollToCard = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    const card = items[index];
    if (!card) return;
    track.scrollTo({
      left: card.offsetLeft - items[0].offsetLeft,
      behavior: "smooth",
    });
  };

  return (
    <section className="bg-white">
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <Reveal variant="left" className="text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {lang === "hi" ? services.headingHi : services.heading}
          </h2>
          <p className="font-script mx-auto mt-4 max-w-2xl text-xl text-ink-soft sm:text-2xl">
            {lang === "hi" ? services.subtitleHi : services.subtitle}
          </p>
        </Reveal>

        <Reveal as="div" variant="up" className="mt-12">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto sm:gap-6"
            aria-label="Services"
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="group relative w-[36vw] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[22.5%] lg:w-[calc((100%-7.5rem)/6)]"
              >
                {/* Tapping a service card opens the booking wizard — the same
                    "tap a card to begin" gesture as the occasion cards. */}
                <Link
                  href={card.href}
                  aria-label={card.name}
                  className="relative block aspect-[9/10] w-full"
                >
                  <Image
                    src={card.image}
                    alt={card.name}
                    fill
                    sizes="(min-width: 1024px) 200px, (min-width: 640px) 22.5vw, 36vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    unoptimized={isUnoptimized(card.image)}
                  />
                  {/* Darken so the name reads on the photo, like the reference */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-3 pb-4 text-center">
                    <span className="font-sans text-sm font-semibold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
                      {card.name}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Dot pagination — one dot per card, active dot gets the outline ring */}
          <div className="mt-8 flex items-center justify-center gap-2.5">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                aria-label={`Go to ${card.name}`}
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
      </div>
    </section>
  );
}
