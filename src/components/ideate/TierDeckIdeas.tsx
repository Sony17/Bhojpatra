"use client";

import { useState } from "react";
import Link from "next/link";
import { packages, type PackageTier } from "@/lib/data";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";

/**
 * /ideate prototype — the home page's three package scrolls collapsed into ONE
 * big card footprint. The tiers overlap as a deck; tapping the front scroll
 * flips to the next tier (Silver → Gold → Platinum → repeat), and tapping a
 * peeking scroll (or a tier pill / rhombus dot) brings that tier straight to
 * the front. The card runs large and the menu never scrolls inside the
 * parchment — courses open one at a time (accordion) so the tallest state
 * still fits the paper.
 *
 * Two treatments of the same interaction are shown so we can pick one before
 * touching the real Packages section:
 *   1. Cascade — the waiting scrolls peek from the top-right, like a stack of
 *      patras on a desk.
 *   2. Fan — the waiting scrolls tuck behind the left/right shoulders, like a
 *      hand of cards.
 */

type DeckVariant = "cascade" | "fan";

/** Per-depth wrapper transforms: depth 0 is the front card. */
const DECK_TRANSFORMS: Record<DeckVariant, string[]> = {
  cascade: [
    "translate3d(0,0,0) scale(1) rotate(0deg)",
    "translate3d(6%,-4.5%,0) scale(0.94) rotate(2.5deg)",
    "translate3d(12%,-9%,0) scale(0.88) rotate(5deg)",
  ],
  fan: [
    "translate3d(0,0,0) scale(1) rotate(0deg)",
    "translate3d(-11%,2.5%,0) scale(0.92) rotate(-7deg)",
    "translate3d(11%,2.5%,0) scale(0.92) rotate(7deg)",
  ],
};

/** Same tier list + admin overrides as the home Packages section. */
function useHomeTiers(): PackageTier[] {
  const { packages: homePackages } = useHomeContent();
  return packages
    .filter((p) => p.id !== "custom")
    .map((p) => {
      const meta = homePackages.tiers.find((x) => x.id === p.id);
      return meta
        ? { ...p, name: meta.name, nameHi: meta.nameHi, price: meta.price }
        : p;
    });
}

function ScrollDeck({ variant }: { variant: DeckVariant }) {
  const { lang, t } = useLang();
  const tiers = useHomeTiers();
  const [active, setActive] = useState(0);
  const count = tiers.length;
  const advance = () => setActive((a) => (a + 1) % count);

  return (
    <div className="select-none">
      {/* Tier pills — jump straight to a tier; also a legend of what's in the
          deck, since two of the three scrolls are mostly hidden. */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {tiers.map((tier, i) => {
          const isActive = i === active;
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(i)}
              className={`rounded-full px-5 py-2 font-display text-sm tracking-wide transition-all duration-300 ${
                isActive
                  ? "bg-maroon text-cream shadow-card ring-1 ring-cream"
                  : "border border-maroon/25 bg-white text-maroon hover:bg-cream/40"
              }`}
            >
              {tierName}
            </button>
          );
        })}
      </div>

      {/* The deck — ONE big card's footprint; the other two tiers wait behind
          it. The top margin clears the front card's ribbon and the waiting
          scrolls' upward peek; the fan is symmetric while the cascade leans
          right, so the cascade box is nudged left to stay visually centred. */}
      <div
        className={`relative mx-auto ${
          variant === "cascade"
            ? "mt-20 w-[min(88vw,500px)] -translate-x-[4%]"
            : "mt-14 w-[min(80vw,480px)]"
        }`}
        style={{ aspectRatio: "458 / 545" }}
      >
        {/* Soft brand glow behind the deck — lifts the scrolls off the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(closest-side,rgba(185,32,37,0.09),rgba(185,32,37,0)_72%)]"
        />
        {tiers.map((tier, i) => {
          const depth = (i - active + count) % count;
          const front = depth === 0;
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          return (
            <div
              key={tier.id}
              className={`absolute inset-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                variant === "fan" ? "origin-bottom" : "origin-top-right"
              } ${
                // Waiting cards drop their floating ribbons — half-hidden
                // "Popular"/"Premium" pills peeking over the front scroll
                // read as clutter, and the veil already names the tier.
                front ? "" : "[&_span.-top-5]:hidden"
              }`}
              style={{
                transform: DECK_TRANSFORMS[variant][depth],
                zIndex: 30 - depth * 10,
              }}
            >
              {/* Opaque backing under the paper area — the pack.png parchment
                  is semi-transparent, so without this the tiers behind read
                  straight through the front scroll's menu. */}
              <div
                aria-hidden="true"
                className="absolute bottom-[14%] left-[11%] right-[19%] top-[13.5%] rounded-[28px] bg-white"
              />
              <PackageScrollCard
                tier={tier}
                selected={front}
                onSelect={front ? advance : () => setActive(i)}
                accordion
                ctaOnFold
                cta={
                  front ? (
                    <Link
                      href={`/book?package=${tier.id}&step=menu`}
                      // Booking shouldn't also flip the deck underneath.
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${t("Book", "बुक करें")} ${tierName}`}
                      className="btn-sheen inline-flex h-9 items-center gap-1.5 rounded-full bg-cream px-5 text-sm font-semibold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition-all duration-300 hover:brightness-105 active:scale-95"
                    >
                      <span className="font-display leading-none">
                        {t("Book", "बुक करें")} {tierName}
                      </span>
                      <span aria-hidden="true" className="text-sm leading-none">
                        →
                      </span>
                    </Link>
                  ) : null
                }
              />
              {/* Veil over waiting scrolls — blanks the menu so the peeking
                  slice reads as a rolled-up patra, with just the tier name
                  written along the visible edge. Clicking it (like clicking
                  anywhere on a waiting card) brings that tier to the front.
                  Fades out as the card travels forward. */}
              <div
                onClick={front ? undefined : () => setActive(i)}
                className={`absolute bottom-[14%] left-[11%] right-[19%] top-[13.5%] z-40 rounded-[28px] bg-white transition-opacity duration-300 ${
                  front
                    ? "pointer-events-none opacity-0"
                    : "cursor-pointer opacity-100"
                }`}
              >
                <span
                  className={`absolute font-display tracking-wide text-maroon ${
                    variant === "cascade"
                      ? "right-6 top-1.5 text-sm"
                      : depth === 1
                        ? "left-2 top-1/2 -translate-y-1/2 rotate-180 text-[13px] [writing-mode:vertical-rl]"
                        : "right-2 top-1/2 -translate-y-1/2 text-[13px] [writing-mode:vertical-rl]"
                  }`}
                >
                  {tierName} · {tier.price}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rhombus progress markers — the elegant stand-in for a "1 / 3". */}
      <div className="mt-8 flex items-center justify-center gap-3.5">
        {tiers.map((tier, i) => {
          const tierName = lang === "hi" ? tier.nameHi : tier.name;
          return (
            <button
              key={tier.id}
              type="button"
              aria-label={tierName}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={`h-2 w-2 rotate-45 transition-all duration-300 ${
                i === active
                  ? "scale-125 bg-maroon"
                  : "border border-maroon/40 bg-white hover:bg-cream"
              }`}
            />
          );
        })}
      </div>

      <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-relaxed text-ink-soft">
        {t(
          "Tap the scroll to flip to the next tier — Silver, Gold, Platinum, and back around. Tap a peeking scroll or a pill to jump straight to it.",
          "स्क्रॉल पर टैप करें और अगला टियर देखें — सिल्वर, गोल्ड, प्लैटिनम, और फिर से। झांकते स्क्रॉल या पिल पर टैप कर सीधे उस टियर पर जाएं।",
        )}
      </p>
    </div>
  );
}

export default function TierDeckIdeas() {
  const { t } = useLang();

  const ideas: {
    variant: DeckVariant;
    title: string;
    titleHi: string;
    blurb: string;
    blurbHi: string;
  }[] = [
    {
      variant: "cascade",
      title: "Idea 1 — Cascade stack",
      titleHi: "आइडिया 1 — कैस्केड स्टैक",
      blurb:
        "The waiting scrolls peek from the top-right, like patras stacked on a desk.",
      blurbHi:
        "बाकी स्क्रॉल ऊपर-दाईं ओर से झांकते हैं, जैसे मेज़ पर रखे पत्र।",
    },
    {
      variant: "fan",
      title: "Idea 2 — Fan stack",
      titleHi: "आइडिया 2 — फैन स्टैक",
      blurb:
        "The waiting scrolls tuck behind the left and right shoulders, like a hand of cards.",
      blurbHi:
        "बाकी स्क्रॉल बाएं-दाएं कंधों के पीछे छिपे रहते हैं, जैसे हाथ में ताश।",
    },
  ];

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl text-maroon sm:text-4xl">
            {t("Package stack ideas", "पैकेज स्टैक आइडियाज़")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {t(
              "The home page shows Silver, Gold and Platinum side by side — three cards wide. Here all three overlap in a single card's footprint: one tap flips to the next tier.",
              "होम पेज पर सिल्वर, गोल्ड और प्लैटिनम अगल-बगल दिखते हैं — तीन कार्ड की चौड़ाई। यहां तीनों एक ही कार्ड की जगह में ओवरलैप होते हैं: एक टैप पर अगला टियर।",
            )}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-maroon">
            {t(
              "Prototype only — the home page is unchanged.",
              "सिर्फ प्रोटोटाइप — होम पेज जैसा का तैसा है।",
            )}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        <div className="mx-auto mt-16 max-w-3xl space-y-24 sm:space-y-28">
          {ideas.map((idea) => (
            <Reveal key={idea.variant} className="min-w-0">
              <h2 className="text-center font-display text-2xl text-maroon sm:text-3xl">
                {t(idea.title, idea.titleHi)}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-ink-soft">
                {t(idea.blurb, idea.blurbHi)}
              </p>
              <Ornament className="mx-auto mt-5 text-maroon/40" />
              <div className="mt-10 sm:mt-12">
                <ScrollDeck variant={idea.variant} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Slim line–diamond–line flourish used under headings and titles. */
function Ornament({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex w-28 items-center justify-center gap-2 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </span>
  );
}
