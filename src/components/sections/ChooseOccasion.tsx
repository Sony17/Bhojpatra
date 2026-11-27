"use client";

import Image from "next/image";
import Link from "next/link";
import SectionIntro from "@/components/SectionIntro";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import TileRow from "@/components/sections/TileRow";
import { useEffect, useState } from "react";

/**
 * First section under the hero — no scroll-reveal so the handoff feels
 * instant while scrolling (food-app velocity).
 */
/** Event types shown as tiles on /home-recreate; `match` picks the stored
 * occasions each one covers. */
const EVENT_GROUPS = [
  { id: "wedding-events", name: "Wedding Events", nameHi: "शादी के कार्यक्रम", match: ["wedding", "engagement", "mehndi", "haldi", "tilak", "reception", "sangeet"], fallbackImage: "/gallery/event-1.jpg" },
  { id: "corporate-events", name: "Corporate Events", nameHi: "कॉर्पोरेट इवेंट", match: ["corporate", "office", "conference"], fallbackImage: "/gallery/event-5.jpg" },
  { id: "house-party", name: "House Party", nameHi: "हाउस पार्टी", match: ["birthday", "house", "anniversary", "kitty"], fallbackImage: "/gallery/event-2.jpg" },
  { id: "society-events", name: "Society Events", nameHi: "सोसाइटी इवेंट", match: ["society", "community", "get-together", "gathering"], fallbackImage: "/gallery/event-4.jpg" },
  { id: "puja-festivals", name: "Puja & Festivals", nameHi: "पूजा और त्योहार", match: ["puja", "pooja", "festival", "diwali", "griha", "religious"], fallbackImage: "/gallery/event-3.jpg" },
];

/** `tiles`: one row of wide photo tiles with View all in the same row
 * (used by /home-recreate). Otherwise the original card rail. */
export default function ChooseOccasion({
  tiles = false,
  title,
  subtitle,
  eyebrow = true,
}: {
  tiles?: boolean;
  /** false hides the small "Occasions" label above the heading. */
  eyebrow?: boolean;
  /** Replace the stored section heading / subtitle. */
  title?: { en: string; hi: string };
  subtitle?: { en: string; hi: string };
}) {
  const { lang, t } = useLang();
  const { occasions } = useHomeContent();
  // Tile mode: put the occasions that bring in the most revenue first.
  const [ranking, setRanking] = useState<string[]>([]);
  useEffect(() => {
    if (!tiles) return;
    let live = true;
    fetch("/api/content/top-occasions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { occasions?: string[] } | null) => {
        if (live && d?.occasions?.length) setRanking(d.occasions);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tiles]);
  const rank = (name: string) => {
    const i = ranking.indexOf(name.trim().toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  // Tile mode groups the stored occasions into the event types people book
  // most. Each group borrows the photo and booking link of its first stored
  // occasion that matches (falling back to a real event photo), and ranks by
  // its best-earning member occasion.
  const findOccasion = (words: string[]) =>
    occasions.items.find((o) => words.some((w) => o.name.toLowerCase().includes(w)));
  const groups = EVENT_GROUPS.map((g) => {
    const match = findOccasion(g.match);
    const best = Math.min(
      ...occasions.items
        .filter((o) => g.match.some((w) => o.name.toLowerCase().includes(w)))
        .map((o) => rank(o.name)),
      Number.MAX_SAFE_INTEGER,
    );
    return {
      id: g.id,
      name: lang === "hi" ? g.nameHi : g.name,
      image: match?.image || g.fallbackImage,
      href: match ? `/book?occasion=${match.id}` : "/book",
      best,
    };
  }).sort((a, b) => a.best - b.best);

  return (
    <section
      id="occasions"
      className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <SectionIntro
        eyebrow={eyebrow ? t("Occasions", "अवसर") : undefined}
        title={title ? (lang === "hi" ? title.hi : title.en) : lang === "hi" ? occasions.headingHi : occasions.heading}
        subtitle={subtitle ? (lang === "hi" ? subtitle.hi : subtitle.en) : lang === "hi" ? occasions.subtitleHi : occasions.subtitle}
      />

      {tiles ? (
        <TileRow
          tiles={groups}
          viewAll={{ href: "/occasions", label: t("View all", "सभी देखें") }}
        />
      ) : (
        <>
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
                  className="group relative w-[9.5rem] shrink-0 overflow-hidden border border-cream shadow-pop transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:w-[11rem]"
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

      <div className="mt-8 flex justify-center sm:mt-10">
        <Button
          href="/occasions"
          variant="secondary"
          rightIcon={<span aria-hidden>→</span>}
        >
          {t("View all occasions", "सभी अवसर देखें")}
        </Button>
      </div>
        </>
      )}
    </section>
  );
}
