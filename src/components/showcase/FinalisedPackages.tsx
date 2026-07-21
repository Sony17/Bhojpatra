"use client";

/**
 * Package section — production redesign.
 *
 * Design principles applied:
 *  • Trust    — only real data (counts come from packageCategoryItems, the
 *               exact quota /book uses). No fabricated "fullness" metrics.
 *  • Clarity  — each tier tells ONE cumulative story ("Everything in X, plus")
 *               with real numbers; the exhaustive per-course truth lives once,
 *               in the comparison grid + a single "View full menu" disclosure.
 *  • Convert  — the popular tier (Gold) is clearly recommended (ring + badge);
 *               large, obvious CTAs; transparent pricing note.
 *  • A11y     — semantic <article>/<ul>, visible focus rings, aria-pressed
 *               toggles, decorative glyphs hidden, 44px tap targets.
 *  • Responsive — full-width snap cards on mobile, grid on sm+, scrollable
 *               comparison table.
 * Palette is brand-only: red #B92025, cream #F0D09E, black, white.
 */

import { useState } from "react";
import Image from "next/image";
import { packages, packageCategoryItems, type PackageTier, type PackageFeature } from "@/lib/data";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { isUnoptimized } from "@/lib/homeContent";

type TierId = "silver" | "gold" | "platinum";
type Bi = [en: string, hi: string];

const RECOMMENDED: TierId = "gold";

const BADGE: Record<TierId, Bi> = {
  silver: ["Best value", "बेस्ट वैल्यू"],
  gold: ["Most popular", "सबसे लोकप्रिय"],
  platinum: ["Premium", "प्रीमियम"],
};

/** Real per-course quota /book uses (packageCategoryItems → allowanceFor()). */
function spec(id: string) {
  const c = packageCategoryItems[id] ?? {};
  return {
    welcome: c.welcome ?? 0,
    starters: c.starters ?? 0,
    live: c.live ?? 0,
    chaat: c.chaat ?? 0,
    chinese: c.chinese ?? 0,
    "south-indian": c["south-indian"] ?? 0,
    main: c.main ?? 0,
    sweets: c.sweets ?? 0,
  };
}

/* ── Surfaces & tone (white → cream → red as the tier climbs) ────────────── */

function surface(id: TierId) {
  if (id === "platinum") return "bg-maroon border border-maroon text-cream";
  if (id === "gold")
    return "bg-cream/50 border border-maroon/30 ring-2 ring-maroon/60 shadow-brand";
  return "bg-white border border-maroon/12";
}
function badgeChip(id: TierId) {
  if (id === "platinum") return "bg-cream text-maroon";
  if (id === "gold") return "bg-maroon text-cream";
  return "bg-cream text-maroon ring-1 ring-maroon/20";
}
const isDark = (id: TierId) => id === "platinum";
const muted = (id: TierId) => (isDark(id) ? "text-cream/90" : "text-ink-soft");
const accent = (id: TierId) => (isDark(id) ? "text-cream" : "text-maroon");

/* ── Icons ──────────────────────────────────────────────────────────────── */

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 10.5l3.4 3.4 7.6-8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ornament({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex w-24 items-center justify-center gap-2 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </span>
  );
}

/* ── Full menu — progressive disclosure (courses fold, items expand) ─────── */

type CourseSegment =
  | { type: "item"; feature: PackageFeature; index: number }
  | { type: "course"; index: number; heading: PackageFeature; items: { feature: PackageFeature; index: number }[] };

function buildCourseSegments(features: PackageFeature[]): CourseSegment[] {
  const segments: CourseSegment[] = [];
  let current: Extract<CourseSegment, { type: "course" }> | null = null;
  features.forEach((feature, index) => {
    if (feature.heading) {
      current = { type: "course", index, heading: feature, items: [] };
      segments.push(current);
    } else if (feature.standalone) {
      current = null;
      segments.push({ type: "item", feature, index });
    } else if (current) {
      current.items.push({ feature, index });
    } else {
      segments.push({ type: "item", feature, index });
    }
  });
  return segments;
}

function RhombusMarker({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-current opacity-70 ${className}`}
    />
  );
}

function MenuList({ features, dark }: { features: PackageFeature[]; dark: boolean }) {
  const { lang } = useLang();
  const segments = buildCourseSegments(features);
  const border = dark ? "border-cream/20" : "border-maroon/10";
  const sub = dark ? "text-cream/90" : "text-ink-soft";
  return (
    <ul className={`text-[13px] ${dark ? "text-cream" : "text-ink"}`}>
      {segments.map((seg) => {
        if (seg.type === "item") {
          const label = lang === "hi" ? seg.feature.labelHi : seg.feature.label;
          return (
            <li key={seg.index} className={`flex items-start gap-2 border-b ${border} py-1.5 leading-snug last:border-b-0`}>
              <RhombusMarker className={dark ? "text-cream" : "text-maroon"} />
              <span>{label}</span>
            </li>
          );
        }
        const headingLabel = lang === "hi" ? seg.heading.labelHi : seg.heading.label;
        return (
          <li key={seg.index} className={`border-b ${border} py-1.5 last:border-b-0`}>
            <p className={`flex items-start gap-2 font-semibold leading-snug ${dark ? "text-cream" : "text-maroon"}`}>
              <RhombusMarker className={dark ? "text-cream" : "text-maroon"} />
              <span>{headingLabel}</span>
            </p>
            {seg.items.length > 0 && (
              <ul className={`mt-1 space-y-0.5 pl-5 leading-snug ${sub}`}>
                {seg.items.map(({ feature, index }) => (
                  <li key={index}>{lang === "hi" ? feature.labelHi : feature.label}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Single-line disclosure toggle (used for "View full menu"). */
function Disclosure({ label, dark, children }: { label: string; dark: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mt-5 border-t pt-4 ${dark ? "border-cream/20" : "border-maroon/10"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          dark ? "text-cream focus-visible:ring-cream focus-visible:ring-offset-maroon" : "text-maroon focus-visible:ring-maroon"
        }`}
      >
        <span>{label}</span>
        <span aria-hidden className={`text-lg leading-none transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ── Tier card ──────────────────────────────────────────────────────────── */

function tierHighlights(id: TierId, s: ReturnType<typeof spec>, t: (en: string, hi: string) => string): string[] {
  if (id === "silver")
    return [
      t("Welcome drink", "वेलकम ड्रिंक"),
      t(`${s.starters} starters`, `${s.starters} स्टार्टर`),
      t("Fixed main-course thali", "फिक्स्ड मेन कोर्स थाली"),
      t(`${s.sweets} sweet`, `${s.sweets} मिठाई`),
      t("One trusted local vendor", "एक भरोसेमंद लोकल वेंडर"),
    ];
  if (id === "gold")
    return [
      t(`${s.starters} starters to choose`, `${s.starters} स्टार्टर चुनें`),
      t(`${s.live} live counter`, `${s.live} लाइव काउंटर`),
      t("Chaat, Chinese & South Indian", "चाट, चाइनीज़ और साउथ इंडियन"),
      t(`${s.sweets} sweets to choose`, `${s.sweets} मिठाई चुनें`),
      t("Multiple specialist vendors", "कई विशेषज्ञ वेंडर"),
    ];
  return [
    t(`${s.starters} premium starters`, `${s.starters} प्रीमियम स्टार्टर`),
    t(`${s.live} live counters`, `${s.live} लाइव काउंटर`),
    t("Bigger chaat & sweet spread", "बड़ा चाट और मिठाई स्प्रेड"),
    t("Curated famous vendors, pan-India", "चुनिंदा मशहूर वेंडर, पूरे भारत"),
  ];
}

function TierCard({ tier, cta }: { tier: PackageTier; cta: React.ReactNode }) {
  const { lang, t } = useLang();
  const id = tier.id as TierId;
  const dark = isDark(id);
  const s = spec(id);
  const recommended = id === RECOMMENDED;

  const name = lang === "hi" ? tier.nameHi : tier.name;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const unit = lang === "hi" ? tier.unitHi : tier.unit;
  const bestFor = lang === "hi" ? tier.bestForHi : tier.bestFor;
  const footnote = lang === "hi" ? tier.footnoteHi : tier.footnote;

  const prevName = id === "gold" ? t("Silver", "सिल्वर") : id === "platinum" ? t("Gold", "गोल्ड") : null;
  const includesLabel = prevName
    ? t(`Everything in ${prevName}, plus`, `${prevName} का सब कुछ, और`)
    : t("What's included", "इसमें क्या शामिल है");
  const highlights = tierHighlights(id, s, t);

  return (
    <article
      aria-label={`${name} ${t("package", "पैकेज")}`}
      className={`card-lift relative flex h-full max-w-full flex-col overflow-hidden rounded-card ${dark ? "isolate" : ""} ${surface(id)}`}
    >
      <div className="relative flex flex-1 flex-col p-5 sm:p-7">
      {/* Premium shimmer on the Platinum card, behind the text */}
      {dark && (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span
            className="absolute inset-0 animate-[bp-shimmer_3.4s_linear_infinite] motion-reduce:animate-none"
            style={{
              background: "linear-gradient(110deg, transparent 35%, rgba(240,208,158,0.28) 50%, transparent 65%)",
              backgroundSize: "220% 100%",
              backgroundPosition: "-120% 0",
            }}
          />
        </span>
      )}

      <span
        className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] shadow-card sm:mb-4 ${badgeChip(id)}`}
      >
        {recommended && <span aria-hidden className="mr-1">★</span>}
        {lang === "hi" ? BADGE[id][1] : BADGE[id][0]}
      </span>

      {/* Name + positioning */}
      <h3 className={`font-display text-[1.75rem] leading-none sm:text-[2rem] ${accent(id)}`}>{name}</h3>
      {bestFor && <p className={`mt-1.5 text-sm font-medium leading-snug sm:mt-2 ${muted(id)}`}>{bestFor}</p>}

      {/* Price */}
      <p className="mt-4 flex items-baseline gap-1.5 sm:mt-5">
        <span className={`text-[1.75rem] font-bold leading-none sm:text-[2rem] ${accent(id)}`}>{tier.price}</span>
        <span className={`text-sm ${muted(id)}`}>{unit}</span>
      </p>
      {pax && <p className={`mt-1 text-[13px] sm:mt-1.5 ${muted(id)}`}>{pax}</p>}

      {/* Primary CTA (kept high so it's always visible) */}
      <div className="mt-4 sm:mt-5">{cta}</div>

      {/* Cumulative "what you get" — the value story, real numbers, always visible */}
      <div className={`mt-5 border-t pt-4 sm:mt-6 sm:pt-5 ${dark ? "border-cream/20" : "border-maroon/10"}`}>
        <p className={`text-xs font-bold uppercase tracking-[0.1em] ${muted(id)}`}>{includesLabel}</p>
        <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5">
          {highlights.map((h) => (
            <li key={h} className={`flex items-start gap-2.5 text-[15px] ${dark ? "text-cream" : "text-ink"}`}>
              <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${accent(id)}`} />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Full menu — one progressive-disclosure for people who want every dish */}
      <Disclosure label={t("View full menu", "पूरा मेन्यू देखें")} dark={dark}>
        <MenuList features={tier.features} dark={dark} />
      </Disclosure>

      {/* Qualifying note — subtle, pinned to the foot */}
      {footnote && footnote.length > 0 && (
        <p className={`mt-auto pt-6 text-[13px] leading-snug ${muted(id)}`}>{footnote.join(" ")}</p>
      )}
      </div>
    </article>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export default function FinalisedPackages() {
  const { lang, t } = useLang();
  const tiers = packages.filter((p) => p.id !== "custom") as PackageTier[];
  const custom = packages.find((p) => p.id === "custom");

  return (
    <section id="packages" className="relative overflow-hidden bg-white py-16 sm:py-20">
      {/* Soft feast wash behind packages — atmosphere without competing with cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden opacity-[0.14]"
      >
        <Image
          src={tiers[1]?.image ?? tiers[0].image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          unoptimized={isUnoptimized(tiers[1]?.image ?? tiers[0].image)}
        />
        <span className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
      </div>
      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal>
          <SectionIntro
            eyebrow={t("Packages", "पैकेज")}
            title={t("Find your feast tier", "अपना दावत टियर चुनें")}
            subtitle={
              <span className="text-ink">
                {t(
                  "Each tier includes everything below it — so you only pay up for what you actually add.",
                  "हर टियर में उसके नीचे वाला सब शामिल है — आप सिर्फ़ उसी के लिए ज़्यादा देते हैं जो आप जोड़ते हैं।",
                )}
              </span>
            }
          >
            <Ornament className="mx-auto mt-6 text-maroon/35" />
          </SectionIntro>
        </Reveal>

        {/* Tier cards — snap carousel on mobile (sized to the scrollport, not
            100vw, so rings/shadows never push past the screen), grid on sm+ */}
        <Reveal
          stagger
          from="right"
          className="no-scrollbar -mx-5 mt-12 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-5 py-3 sm:mx-auto sm:grid sm:max-w-6xl sm:snap-none sm:grid-cols-2 sm:items-stretch sm:gap-6 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-3"
        >
          {tiers.map((tier) => {
            const tierName = lang === "hi" ? tier.nameHi : tier.name;
            return (
              <div
                key={tier.id}
                className="w-full max-w-[20.5rem] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink"
              >
                <TierCard
                  tier={tier}
                  cta={
                    <Button
                      href={`/book?package=${tier.id}&step=menu`}
                      variant={tier.id === "platinum" ? "inverse" : "primary"}
                      fullWidth
                      aria-label={`${t("Book the", "बुक करें")} ${tierName} ${t("package", "पैकेज")}`}
                      rightIcon={<span aria-hidden="true">→</span>}
                    >
                      <span className="font-display leading-none">{t("Book", "बुक करें")} {tierName}</span>
                    </Button>
                  }
                />
              </div>
            );
          })}
        </Reveal>

        {/* Single Stall — a distinct offering below the three tiers: one vendor,
            build-your-own, "your price". Kept as its own strip (not a fourth
            tier card) so the Silver/Gold/Platinum hierarchy stays intact. */}
        {custom && (
          <Reveal className="mx-auto mt-8 max-w-6xl">
            <div className="rounded-card border border-maroon/20 bg-cream/40 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-display text-xs uppercase tracking-wide text-maroon">
                    {lang === "hi" ? custom.taglineHi : custom.tagline}
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
                    {lang === "hi" ? custom.nameHi : custom.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {t(
                      "Pick one vendor, build your own menu, and pay only for what you select.",
                      "एक वेंडर चुनें, अपना मेन्यू बनाएं, और सिर्फ़ अपनी पसंद के लिए भुगतान करें।",
                    )}
                  </p>
                </div>
                <Button
                  href="/book?package=custom&step=menu"
                  variant="primary"
                  rightIcon={<span aria-hidden="true">→</span>}
                  className="shrink-0"
                  aria-label={t(
                    "Build your Single Stall",
                    "अपना सिंगल स्टॉल बनाएं",
                  )}
                >
                  <span className="font-display leading-none">
                    {t("Build your Single Stall", "अपना सिंगल स्टॉल बनाएं")}
                  </span>
                </Button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
