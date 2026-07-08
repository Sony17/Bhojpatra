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
import { packages, packageCategoryItems, type PackageTier, type PackageFeature } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";

type TierId = "silver" | "gold" | "platinum";
type Bi = [en: string, hi: string];

const RECOMMENDED: TierId = "gold";

const BADGE: Record<TierId, Bi> = {
  silver: ["Best value", "बेस्ट वैल्यू"],
  gold: ["Most popular", "सबसे लोकप्रिय"],
  platinum: ["Premium", "प्रीमियम"],
};
const VENDORS: Record<TierId, Bi> = {
  silver: ["Single vendor", "एक वेंडर"],
  gold: ["Multiple vendors", "कई वेंडर"],
  platinum: ["Famous vendors", "मशहूर वेंडर"],
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
const muted = (id: TierId) => (isDark(id) ? "text-cream/75" : "text-ink-soft");
const accent = (id: TierId) => (isDark(id) ? "text-cream" : "text-maroon");

/* ── Icons ──────────────────────────────────────────────────────────────── */

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 10.5l3.4 3.4 7.6-8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.46 9.46 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.45 9.45 0 01-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 012.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.36 11.36 0 0012.04.5C5.76.5.65 5.61.65 11.89c0 2.01.53 3.98 1.53 5.71L.5 23.5l6.05-1.59a11.35 11.35 0 005.49 1.4h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05z" />
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
  const sub = dark ? "text-cream/80" : "text-ink-soft";
  return (
    <ul className={`text-xs ${dark ? "text-cream" : "text-ink"}`}>
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
        className={`flex w-full items-center justify-between rounded text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
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
      className={`card-lift relative flex h-full flex-col rounded-card p-6 sm:p-7 ${dark ? "isolate" : ""} ${surface(id)}`}
    >
      {/* Premium shimmer on the Platinum card, behind the text */}
      {dark && (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-card">
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

      {/* Badge (single recommended/role flag) */}
      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${badgeChip(id)}`}>
        {recommended && <span aria-hidden className="mr-1">★</span>}
        {lang === "hi" ? BADGE[id][1] : BADGE[id][0]}
      </span>

      {/* Name + positioning */}
      <h3 className={`mt-4 font-display text-[2rem] leading-none ${accent(id)}`}>{name}</h3>
      {bestFor && <p className={`mt-2 text-[13px] leading-snug ${muted(id)}`}>{bestFor}</p>}

      {/* Price */}
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className={`text-[2rem] font-bold leading-none ${accent(id)}`}>{tier.price}</span>
        <span className={`text-sm ${muted(id)}`}>{unit}</span>
      </p>
      {pax && <p className={`mt-1.5 text-xs ${muted(id)}`}>{pax}</p>}

      {/* Primary CTA (kept high so it's always visible) */}
      <div className="mt-5">{cta}</div>

      {/* Cumulative "what you get" — the value story, real numbers, always visible */}
      <div className={`mt-6 border-t pt-5 ${dark ? "border-cream/20" : "border-maroon/10"}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${muted(id)}`}>{includesLabel}</p>
        <ul className="mt-3 space-y-2.5">
          {highlights.map((h) => (
            <li key={h} className={`flex items-start gap-2.5 text-sm ${dark ? "text-cream" : "text-ink"}`}>
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
        <p className={`mt-auto pt-6 text-xs leading-snug ${muted(id)}`}>{footnote.join(" ")}</p>
      )}
    </article>
  );
}

/* ── Comparison grid — the single exhaustive per-course comparison ───────── */

type Row = { key: keyof ReturnType<typeof spec> | "vendors"; label: Bi };
const ROWS: Row[] = [
  { key: "starters", label: ["Starters", "स्टार्टर"] },
  { key: "live", label: ["Live counters", "लाइव काउंटर"] },
  { key: "chaat", label: ["Chaat", "चाट"] },
  { key: "chinese", label: ["Chinese", "चाइनीज़"] },
  { key: "south-indian", label: ["South Indian", "साउथ इंडियन"] },
  { key: "main", label: ["Main course", "मेन कोर्स"] },
  { key: "sweets", label: ["Sweets", "मिठाई"] },
  { key: "vendors", label: ["Vendors", "वेंडर"] },
];

function CompareGrid({ tiers }: { tiers: PackageTier[] }) {
  const { lang, t } = useLang();
  const [highlight, setHighlight] = useState(true);
  const bi = (v: Bi) => (lang === "hi" ? v[1] : v[0]);

  const cellFor = (tier: PackageTier, key: Row["key"]) => {
    if (key === "vendors") return bi(VENDORS[tier.id as TierId]);
    const v = spec(tier.id)[key];
    return v === 0 ? "—" : String(v);
  };
  const upgraded = (key: Row["key"], i: number) => {
    if (!highlight || i === 0) return false;
    if (key === "vendors") return true;
    return spec(tiers[i].id)[key] > spec(tiers[i - 1].id)[key];
  };

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setHighlight((v) => !v)}
          aria-pressed={highlight}
        >
          {highlight ? t("Hide upgrades", "अपग्रेड छुपाएँ") : t("Highlight upgrades", "अपग्रेड दिखाएँ")}
        </Button>
      </div>
      <div className="no-scrollbar overflow-x-auto rounded-card border border-maroon/15">
        <table className="w-full min-w-[440px] border-collapse text-sm">
          <caption className="sr-only">{t("What each package includes, by course", "हर पैकेज में क्या शामिल है")}</caption>
          <thead>
            <tr className="bg-maroon text-cream">
              <th scope="col" className="p-3 text-left font-semibold">{t("What you get", "आपको क्या मिलता है")}</th>
              {tiers.map((tier) => (
                <th key={tier.id} scope="col" className="p-3 text-center font-semibold">
                  <div className="font-display text-base">{lang === "hi" ? tier.nameHi : tier.name}</div>
                  <div className="text-[11px] font-normal text-cream/85">{tier.price}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, r) => (
              <tr key={String(row.key)} className={r % 2 ? "bg-cream/20" : "bg-white"}>
                <th scope="row" className="p-3 text-left font-medium text-ink">{bi(row.label)}</th>
                {tiers.map((tier, i) => {
                  const up = upgraded(row.key, i);
                  return (
                    <td key={tier.id} className={`p-3 text-center ${up ? "font-bold text-maroon" : "text-ink"}`}>
                      <span className="inline-flex items-center gap-1">
                        {up && <span aria-hidden>↑</span>}
                        {cellFor(tier, row.key)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export default function FinalisedPackages() {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  const tiers = packages.filter((p) => p.id !== "custom") as PackageTier[];
  const custom = packages.find((p) => p.id === "custom");

  const waText = t(
    "Hi Bhojpatra, none of the packages quite fit my event — I'd like a curated package.",
    "नमस्ते भोजपत्र, कोई भी पैकेज मेरे इवेंट के लिए पूरी तरह फिट नहीं है — मुझे एक कस्टम पैकेज चाहिए।",
  );
  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waText)}`;

  const trust: Bi[] = [
    ["Verified vendors", "वेरिफाइड वेंडर"],
    ["Transparent pricing", "पारदर्शी कीमत"],
    ["Book with a small advance", "छोटे अग्रिम से बुक करें"],
  ];

  return (
    <section id="packages" className="relative overflow-hidden py-16 sm:py-20">
      <div className="w-full px-5 sm:px-8 lg:px-12">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {t("Find your feast tier", "अपना दावत टियर चुनें")}
          </h2>
          <p className="font-script mt-4 text-[0.84375rem] text-ink-soft sm:text-[0.9375rem]">
            {t(
              "Each tier includes everything below it — so you only pay up for what you actually add.",
              "हर टियर में उसके नीचे वाला सब शामिल है — आप सिर्फ़ उसी के लिए ज़्यादा देते हैं जो आप जोड़ते हैं।",
            )}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/40" />
        </Reveal>

        {/* Tier cards — full-width snap carousel on mobile, grid on sm+ */}
        <Reveal
          stagger
          from="right"
          className="no-scrollbar -mx-5 mt-12 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto px-5 pb-4 pt-4 sm:mx-auto sm:grid sm:max-w-6xl sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
        >
          {tiers.map((tier) => {
            const tierName = lang === "hi" ? tier.nameHi : tier.name;
            return (
              <div key={tier.id} className="w-[calc(100vw-2.5rem)] shrink-0 snap-center sm:w-auto sm:shrink">
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

        {/* Trust strip */}
        <Reveal className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          {trust.map((item) => (
            <span key={item[0]} className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4 text-maroon" />
              {lang === "hi" ? item[1] : item[0]}
            </span>
          ))}
        </Reveal>

        {/* Deep-dive comparison (progressive disclosure) */}
        <Reveal className="mx-auto mt-16 max-w-4xl">
          <div className="mb-7 text-center">
            <h3 className="font-display text-2xl text-maroon">{t("Compare every tier", "हर टियर की तुलना करें")}</h3>
            <Ornament className="mx-auto mt-3 text-maroon/40" />
          </div>
          <CompareGrid tiers={tiers} />
        </Reveal>

        {/* Single Stall — the flexible, à-la-carte option */}
        {custom && (
          <Reveal className="mx-auto mt-12 max-w-3xl">
            <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-maroon/40 bg-cream/20 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl text-maroon">
                  {t("Just one stall?", "सिर्फ़ एक स्टॉल?")}{" "}
                  <span className="text-ink">{lang === "hi" ? custom.nameHi : custom.name}</span>
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {t(
                    "Build your own menu, one vendor — and pay only for what you pick.",
                    "अपना मेन्यू बनाएँ, एक वेंडर — और सिर्फ़ अपनी पसंद के लिए भुगतान करें।",
                  )}
                </p>
              </div>
              <Button
                href="/book?package=custom&step=menu"
                variant="secondary"
                className="shrink-0"
                rightIcon={<span aria-hidden="true">→</span>}
              >
                <span className="font-display">{t("Build your own", "अपना बनाएँ")}</span>
              </Button>
            </div>
          </Reveal>
        )}

        {/* Trust / help footer — pricing note + custom-package help, merged */}
        <Reveal className="mx-auto mt-8 max-w-3xl">
          <div className="flex flex-col items-center gap-3 rounded-card border border-maroon/15 bg-cream/30 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-soft">
              {t(
                "Prices are approximate — the final price depends on your menu, guests & vendors.",
                "कीमतें अनुमानित हैं — अंतिम कीमत आपके मेन्यू, मेहमानों और वेंडरों पर निर्भर करती है।",
              )}
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-maroon underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {t("Need something custom? Chat with us", "कुछ कस्टम चाहिए? हमसे बात करें")}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
