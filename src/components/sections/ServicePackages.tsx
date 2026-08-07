"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Reveal from "@/components/Reveal";
import { CategoryChips, CategoryChip } from "@/components/ui";
import { servicePackages, type ServicePackage } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { money } from "@/lib/money";

/**
 * "Choose Your Service Package" — the four-tier service comparison from the
 * reference design, rebuilt strictly in the four brand colours. The mockup's
 * bronze / silver / gold / red metallics are NOT brand colours, so the four
 * tiers are differentiated by fill + emphasis rather than new hues: an
 * escalating ramp of white → cream → red → black (cream text on the dark
 * fills), per CLAUDE.md.
 *
 * Two modes:
 * - Marketing (default): a full-bleed `<section>`, display-only.
 * - Selectable (`onSelect` given, usually with `embedded`): the booking
 *   wizard's mandatory service step — each card becomes a single-select control
 *   (`selectedId` marks the choice) and shows the feast price for `guests`.
 */
export default function ServicePackages({
  packages = servicePackages,
  selectedId,
  onSelect,
  guests,
  embedded = false,
}: {
  packages?: ServicePackage[];
  /** The chosen package id (single-select) — only meaningful with `onSelect`. */
  selectedId?: string;
  /** Present ⇒ selectable mode: clicking a card picks it. */
  onSelect?: (id: string) => void;
  /** Headcount — when set, each card shows its computed feast price. */
  guests?: number;
  /** Drop the marketing `<section>` chrome so it nests inside the wizard step. */
  embedded?: boolean;
}) {
  const { lang, t } = useLang();
  const selectable = typeof onSelect === "function";

  // On phones the four tier cards would stack into a very long scroll, so
  // mobile reduces them to a chip-tab row showing one card at a time (the
  // already-chosen tier first in wizard mode). Tablet/desktop keep the
  // side-by-side comparison grid.
  const [activeIdx, setActiveIdx] = useState(() => {
    const i = packages.findIndex((p) => p.id === selectedId);
    return i >= 0 ? i : 0;
  });
  // `packages` can re-hydrate from the admin-configured set — keep the open
  // tab in range so mobile never shows an empty step.
  const shownIdx = Math.min(activeIdx, Math.max(0, packages.length - 1));

  const body = (
    <div
      className={
        embedded ? "relative w-full" : "relative w-full px-5 sm:px-8 lg:px-12"
      }
    >
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="flex items-center justify-center gap-3 font-display text-3xl uppercase tracking-wide text-maroon sm:text-4xl">
            <Flourish className="hidden text-maroon/50 sm:block" />
            {t("Choose Your Service Package", "अपना सर्विस पैकेज चुनें")}
            <Flourish className="hidden rotate-180 text-maroon/50 sm:block" />
          </h2>
          <p className="mt-4 text-base text-ink-soft sm:text-lg">
            {t(
              "Menu finalized. Now choose your perfect service experience.",
              "मेन्यू फ़ाइनल हो गया? अब चुनिए अपना परफेक्ट सर्विस अनुभव।",
            )}
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-7xl sm:hidden">
          <CategoryChips label={t("Service packages", "सर्विस पैकेज")}>
            {packages.map((pkg, i) => (
              <CategoryChip
                key={pkg.id}
                selected={i === shownIdx}
                onClick={() => setActiveIdx(i)}
                leftIcon={<span aria-hidden="true">{pkg.icon}</span>}
              >
                {lang === "hi" ? pkg.nameHi : pkg.name}
              </CategoryChip>
            ))}
          </CategoryChips>
        </Reveal>

        <Reveal
          stagger
          className="mx-auto mt-5 grid max-w-7xl grid-cols-1 items-stretch gap-6 sm:mt-14 sm:grid-cols-2 xl:grid-cols-4"
        >
          {packages.map((pkg, i) => (
            <ServiceCard
              key={pkg.id}
              pkg={pkg}
              variant={VARIANTS[i % VARIANTS.length]}
              lang={lang}
              t={t}
              selectable={selectable}
              selected={pkg.id === selectedId}
              onSelect={onSelect}
              guests={guests}
              className={i === shownIdx ? undefined : "max-sm:hidden"}
            />
          ))}
        </Reveal>

        {/* Trust bar — the reference's reassurance strip, in brand colours.
            Marketing surfaces only; the wizard's Essentials step keeps just
            the tier choice. */}
        {!embedded && (
          <Reveal className="mx-auto mt-12 max-w-5xl">
            <ul className="grid grid-cols-1 gap-4 rounded-card border border-maroon/15 bg-cream/40 p-5 sm:grid-cols-2 sm:gap-5 sm:p-6 lg:grid-cols-4">
              {TRUST_ITEMS.map((item) => (
                <li key={item.en} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon text-base text-cream"
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-maroon">
                      {t(item.en, item.hi)}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {t(item.subEn, item.subHi)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
  );

  if (embedded) return body;
  return (
    <section id="service-packages" className="relative overflow-hidden py-20 sm:py-24">
      {body}
    </section>
  );
}

/* ── Per-card visual variant ────────────────────────────────────────────────
   One brand language, four surfaces: the tier is signalled by an escalating
   fill (white → cream → red → black) while the accents stay red-on-light /
   cream-on-dark throughout.

   Two rules keep it looking premium:
   1. Every fill is a *pure* brand hex. Tinted fills (`bg-ink/10` on cream)
      muddy into khaki/grey — a hue the brand doesn't own — so pills and panels
      sit on white (light cards) or cream (dark cards) instead. Alpha survives
      only on 1px hairlines, where it reads as a lighter rule, not a colour.
   2. The price panel is quiet and the Select control is solid. The old card
      had it backwards — a heavy filled price slab with a washed-out tint pill
      under it — so the CTA lost to the price. */
interface Variant {
  /** Card background + border. */
  card: string;
  /** Centred "Package X" badge overlapping the top edge. */
  badge: string;
  /** Icon halo — must contrast with `card` (a cream halo on a cream card
   *  vanished, which is what flattened the mid tier). */
  halo: string;
  /** Section label pill (INCLUDES / NOT INCLUDED / BEST FOR). */
  label: string;
  /** View / Hide details control. */
  toggle: string;
  /** Hairline flanking the section label + section dividers. */
  dash: string;
  /** ✓ include-tick circle. */
  tick: string;
  /** ✕ not-included circle (outline + glyph colour). */
  cross: string;
  /** BEST FOR rhombus marker. */
  marker: string;
  /** Title colour. */
  title: string;
  /** Muted copy (subtitle, not-included, captions). */
  muted: string;
  /** Body copy (include / best-for lines). */
  body: string;
  /** Quiet price panel at the card foot (surface + border + base text). */
  price: string;
  /** "Starting from" eyebrow + the headline per-guest figure. */
  priceValue: string;
  /** Hairline between the per-guest figure and the computed feast total. */
  priceRule: string;
  /** Select control, unchosen — outlined, so the chosen one clearly wins. */
  ctaIdle: string;
  /** Select control, chosen — solid. */
  ctaOn: string;
  /** Ring colour when this card is the selected service (wizard mode). */
  sel: string;
}

const VARIANTS: Variant[] = [
  // Package A — Essential: white surface, red accents on cream panels.
  {
    card: "bg-white border-cream",
    badge: "bg-maroon text-cream",
    halo: "bg-cream text-maroon",
    label: "bg-cream text-maroon",
    toggle: "border border-maroon/30 bg-cream text-maroon",
    dash: "bg-cream",
    tick: "bg-maroon text-cream",
    cross: "border-maroon text-maroon",
    marker: "bg-maroon",
    title: "text-maroon",
    muted: "text-ink-soft",
    body: "text-ink",
    price: "border-cream bg-cream text-ink",
    priceValue: "text-maroon",
    priceRule: "bg-maroon/20",
    ctaIdle: "border border-maroon bg-white text-maroon",
    ctaOn: "bg-maroon text-cream",
    sel: "ring-maroon",
  },
  // Package B — Standard: cream surface, white panels, red accents.
  {
    card: "bg-cream border-maroon/25",
    badge: "bg-maroon text-cream",
    halo: "bg-white text-maroon",
    label: "bg-white text-maroon",
    toggle: "border border-maroon/30 bg-white text-maroon",
    dash: "bg-maroon/25",
    tick: "bg-maroon text-cream",
    cross: "border-ink text-ink",
    marker: "bg-maroon",
    title: "text-ink",
    muted: "text-ink-soft",
    body: "text-ink",
    price: "border-white bg-white text-ink",
    priceValue: "text-maroon",
    priceRule: "bg-maroon/20",
    ctaIdle: "border border-maroon bg-white text-maroon",
    ctaOn: "bg-maroon text-cream",
    sel: "ring-maroon",
  },
  // Package C — Premium: red fill, cream text, cream panels.
  {
    card: "bg-maroon border-maroon",
    badge: "bg-cream text-maroon",
    halo: "bg-cream text-maroon",
    label: "bg-cream text-maroon",
    toggle: "border border-cream text-cream",
    dash: "bg-cream/40",
    tick: "bg-cream text-maroon",
    cross: "border-cream text-cream",
    marker: "bg-cream",
    title: "text-cream",
    muted: "text-cream",
    body: "text-cream",
    price: "border-cream bg-cream text-ink",
    priceValue: "text-maroon",
    priceRule: "bg-maroon/20",
    ctaIdle: "border border-cream text-cream",
    ctaOn: "bg-cream text-maroon",
    sel: "ring-cream",
  },
  // Package D — Ultra Luxury: black fill, cream text (top tier). Same cream
  // panels as C, but every accent resolves to ink instead of red — the two
  // luxury tiers read as a pair without repeating each other.
  {
    card: "bg-ink border-ink",
    badge: "bg-cream text-ink",
    halo: "bg-cream text-ink",
    label: "bg-cream text-ink",
    toggle: "border border-cream text-cream",
    dash: "bg-cream/35",
    tick: "bg-cream text-ink",
    cross: "border-cream text-cream",
    marker: "bg-cream",
    title: "text-cream",
    muted: "text-cream",
    body: "text-cream",
    price: "border-cream bg-cream text-ink",
    priceValue: "text-ink",
    priceRule: "bg-ink/20",
    ctaIdle: "border border-cream text-cream",
    ctaOn: "bg-cream text-ink",
    sel: "ring-cream",
  },
];

const TRUST_ITEMS = [
  {
    icon: "🛡",
    en: "Verified Vendors",
    hi: "सत्यापित वेंडर",
    subEn: "100% verified & trusted partners",
    subHi: "100% सत्यापित और भरोसेमंद पार्टनर",
  },
  {
    icon: "₹",
    en: "Transparent Pricing",
    hi: "पारदर्शी मूल्य",
    subEn: "No hidden charges",
    subHi: "कोई छिपा शुल्क नहीं",
  },
  {
    icon: "🎧",
    en: "Dedicated Support",
    hi: "समर्पित सहायता",
    subEn: "24x7 assistance",
    subHi: "24x7 सहायता",
  },
  {
    icon: "★",
    en: "Quality Assured",
    hi: "गुणवत्ता आश्वासन",
    subEn: "Hygienic & premium service",
    subHi: "स्वच्छ और प्रीमियम सेवा",
  },
];

/** Per-guest price band, e.g. "₹180 – ₹300" / "₹400 – ₹700+" / flat "₹5,000". */
function priceBand(pkg: ServicePackage): string {
  if (!pkg.perPlate) return money(pkg.priceMin);
  return `${money(pkg.priceMin)} – ${money(pkg.priceMax)}${pkg.openTop ? "+" : ""}`;
}

function ServiceCard({
  pkg,
  variant,
  lang,
  t,
  selectable = false,
  selected = false,
  onSelect,
  guests,
  className = "",
}: {
  pkg: ServicePackage;
  variant: Variant;
  lang: "en" | "hi";
  t: (en: string, hi: string) => string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  guests?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = lang === "hi" ? pkg.nameHi : pkg.name;
  const subtitle = lang === "hi" ? pkg.subtitleHi : pkg.subtitle;
  const choose = () => onSelect?.(pkg.id);
  // The amount this tier adds to the feast: per-guest floor × headcount (a flat
  // fee if the tier isn't per-guest). Package A's ₹0 floor adds nothing.
  const feastPrice =
    typeof guests === "number" && pkg.perPlate ? pkg.priceMin * guests : pkg.priceMin;
  const feastLabel = money(feastPrice);

  return (
    <div
      {...(selectable
        ? {
            role: "button" as const,
            tabIndex: 0,
            "aria-pressed": selected,
            onClick: choose,
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                choose();
              }
            },
          }
        : {})}
      className={`card-lift relative flex h-full flex-col rounded-card border p-6 pt-8 shadow-card transition duration-300 ${variant.card} ${
        selectable ? "cursor-pointer" : ""
      } ${selected ? `ring-2 shadow-brand ${variant.sel}` : ""} ${className}`}
    >
      {/* Badge — centred, overlapping the top edge. */}
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[0.7rem] font-bold uppercase tracking-wider shadow-card ${variant.badge}`}
      >
        {pkg.badge}
      </span>

      {/* Header — icon, title, subtitle (centred). The halo is per-variant so
          it never matches the card fill (a cream halo on the cream tier read as
          a floating glyph with no medallion). */}
      <span
        aria-hidden="true"
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-card ${variant.halo}`}
      >
        {pkg.icon}
      </span>
      <h3 className={`mt-4 text-center font-display text-2xl leading-tight ${variant.title}`}>
        {name}
      </h3>
      <p className={`mt-1 text-center text-sm ${variant.muted}`}>{subtitle}</p>

      {/* Expand / Collapse toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        aria-expanded={expanded}
        className={`mt-4 flex items-center justify-center gap-1.5 self-center rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${variant.toggle}`}
      >
        <span>
          {expanded
            ? t("Hide details", "विवरण छिपाएं")
            : t("View details", "विवरण देखें")}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Collapsible details container */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {/* INCLUDES */}
          <SectionLabel variant={variant}>{t("Includes", "शामिल")}</SectionLabel>
          <ul className="mt-3 space-y-2">
            {pkg.includes.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${variant.tick}`}
                >
                  ✓
                </span>
                <span className={variant.body}>{line}</span>
              </li>
            ))}
          </ul>

          {/* NOT INCLUDED — Package A only. */}
          {pkg.notIncluded.length > 0 && (
            <>
              <SectionLabel variant={variant}>
                {t("Not Included", "शामिल नहीं")}
              </SectionLabel>
              <ul className="mt-3 space-y-2">
                {pkg.notIncluded.map((line) => (
                  <li
                    key={line}
                    className={`flex items-start gap-2.5 text-sm ${variant.muted}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${variant.cross}`}
                    >
                      ✕
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* BEST FOR */}
          <SectionLabel variant={variant}>{t("Best For", "इनके लिए")}</SectionLabel>
          <ul className="mt-3 space-y-2">
            {pkg.bestFor.map((line) => (
              <li key={line} className={`flex items-center gap-2.5 text-sm ${variant.body}`}>
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rotate-45 ${variant.marker}`}
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Price panel — pinned to the card foot so all four align. Per-guest
          leads (display face, tier accent colour); the computed feast total is
          demoted to a sub-line under a hairline. */}
      <div className="mt-auto pt-6">
        <div className={`overflow-hidden rounded-control border ${variant.price}`}>
          <div className="px-4 py-3 text-center">
            <p
              className={`text-[0.62rem] font-bold uppercase tracking-[0.18em] ${variant.priceValue}`}
            >
              {t("Starting from", "शुरुआती कीमत")}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5">
              <span
                className={`font-display text-2xl leading-none ${variant.priceValue}`}
              >
                {priceBand(pkg)}
              </span>
              <span className="text-xs">
                {pkg.perPlate
                  ? t("per guest", "प्रति मेहमान")
                  : t("flat", "एकमुश्त")}
              </span>
            </p>
          </div>
          {/* Selectable (wizard): the exact amount this tier adds to the feast. */}
          {selectable && typeof guests === "number" && (
            <>
              <span aria-hidden="true" className={`block h-px ${variant.priceRule}`} />
              <p className="px-4 py-2 text-center text-xs font-semibold">
                {feastPrice > 0
                  ? t(
                      `${feastLabel} for ${guests} guests`,
                      `${guests} मेहमानों के लिए ${feastLabel}`,
                    )
                  : t("Included — no extra charge", "शामिल — कोई अतिरिक्त शुल्क नहीं")}
              </p>
            </>
          )}
        </div>
        {/* Select control — the whole card is the button; this pill mirrors its
            state so the choice is obvious. Outlined until chosen, then solid. */}
        {selectable && (
          <span
            className={`mt-3 flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold ${
              selected ? variant.ctaOn : variant.ctaIdle
            }`}
          >
            {selected
              ? `✓ ${t("Selected", "चुना गया")}`
              : t("Select this package", "यह पैकेज चुनें")}
          </span>
        )}
      </div>
    </div>
  );
}

/** Centred section label flanked by hairlines (INCLUDES / NOT INCLUDED / …). */
function SectionLabel({
  variant,
  children,
}: {
  variant: Variant;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <span aria-hidden="true" className={`h-px w-6 ${variant.dash}`} />
      <span
        className={`rounded-full px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${variant.label}`}
      >
        {children}
      </span>
      <span aria-hidden="true" className={`h-px w-6 ${variant.dash}`} />
    </div>
  );
}

/** Small flourish flanking the section heading (matches the reference). */
function Flourish({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-1 ${className}`}>
      <span className="h-px w-6 bg-current opacity-60" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px w-4 bg-current opacity-60" />
    </span>
  );
}
