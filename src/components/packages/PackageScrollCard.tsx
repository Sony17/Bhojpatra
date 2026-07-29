"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { type PackageTier, type PackageFeature } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * The "patra scroll" package card — the entire menu written on the clean scroll
 * artwork (public/pack.png).
 *
 * Shared between the home page's Packages section and the booking wizard's
 * package step so both surfaces advertise a tier identically. The card renders
 * the tier's name, price, pax range, the full course/item list and footnote;
 * the caller supplies the action area via `cta` (a home-page Link, or a
 * booking-step select button).
 */

/** Aspect ratio of the patra scroll artwork (public/pack.png, 458×545). */
const SCROLL_RATIO = "458 / 545";

/**
 * Writable area of the scroll, as inset % of the artwork. The menu is
 * positioned inside this box; nudge these if text crowds the frame. The
 * horizontal insets keep text clear of the maroon border and the right-hand
 * roll; the vertical insets clear the top lace band, the dotted flourish
 * (83.5–84.2% of the artwork height) and the bottom roll (from 88.1%).
 *
 * The box reaches well down the parchment at every breakpoint so the whole
 * menu is written out at once — no inner scrollbar on any surface. Mobile now
 * shares the roomier desktop box; the cards there are large enough that the
 * full course list still clears the bottom roll before the fold-mounted CTA.
 */
const PARCHMENT = "left-[13%] right-[21%] top-[13.5%] bottom-[17%]";

/** Small cream rhombus marker — elegant, ringed in maroon. */
function RhombusMarker() {
  return (
    <span
      aria-hidden="true"
      className="mt-[max(3px,1.2cqw)] h-[max(5px,1.7cqw)] w-[max(5px,1.7cqw)] shrink-0 rotate-45 bg-cream shadow-[inset_0_0_0_1px_rgba(185,32,37,0.55)]"
    />
  );
}

/** A flat item, or a course header holding the items beneath it. */
type CourseSegment =
  | { type: "item"; feature: PackageFeature; index: number }
  | {
      type: "course";
      index: number;
      heading: PackageFeature;
      items: { feature: PackageFeature; index: number }[];
    };

/** Fold a flat feature list into segments: a `heading` opens a course that
    collects every following non-heading item until the next heading. */
function buildCourseSegments(features: PackageFeature[]): CourseSegment[] {
  const segments: CourseSegment[] = [];
  let current: Extract<CourseSegment, { type: "course" }> | null = null;
  features.forEach((feature, index) => {
    if (feature.heading) {
      current = { type: "course", index, heading: feature, items: [] };
      segments.push(current);
    } else if (feature.standalone) {
      // Ends the current course and stands on its own at the top level.
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

export default function PackageScrollCard({
  tier,
  selected,
  onSelect,
  cta,
  ctaOnFold = false,
  priority = false,
  accordion = false,
}: {
  tier: PackageTier;
  selected: boolean;
  onSelect: () => void;
  /** Action area rendered on the parchment, below the menu (Link / button). */
  cta: ReactNode;
  /** Place the CTA on the scroll's bottom red fold instead of inside the parchment. */
  ctaOnFold?: boolean;
  /** Eager-load the scroll image (use for the popular / above-the-fold card). */
  priority?: boolean;
  /** Only one course open at a time — bounds the menu's height so compact
      surfaces (e.g. the /ideate deck) never scroll inside the parchment. */
  accordion?: boolean;
}) {
  const { lang, t } = useLang();
  // Group the flat feature list into course segments (a heading plus the items
  // beneath it). The full-scroll surfaces (home page, booking wizard) write the
  // WHOLE menu out — every course header and every item visible at once, no
  // click-to-reveal — so nothing on the scroll is ever hidden. Only the compact
  // accordion deck (/ideate) collapses courses to bound its height, opening one
  // at a time.
  const segments = buildCourseSegments(tier.features);
  const [openCourses, setOpenCourses] = useState<Set<number>>(() =>
    accordion
      ? new Set()
      : new Set(segments.filter((s) => s.type === "course").map((s) => s.index)),
  );
  const toggleCourse = (index: number) =>
    setOpenCourses((prev) => {
      if (accordion) return prev.has(index) ? new Set() : new Set([index]);
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const popular = tier.popular === true;
  const premium = tier.id === "platinum";
  const silver = tier.id === "silver";
  const tierName = lang === "hi" ? tier.nameHi : tier.name;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const bestFor = lang === "hi" ? tier.bestForHi : tier.bestFor;
  const footnote = lang === "hi" ? tier.footnoteHi : tier.footnote;

  // Whole-scroll metallic finish — the palette's stand-ins for the metals:
  // brand white reads silver, brand cream reads gold, and brand black reads
  // platinum. Each is diagonal banding (the metallic read) masked to the patra
  // silhouette, BLENDED into the artwork rather than painted over it —
  // multiply deepens gold/platinum and soft-light brightens silver, so the
  // scroll's red stays saturated instead of fading under a translucent wash.
  // Custom (and any future tier) stays plain.
  // Kept deliberately subtle — a soft metallic wash, not hard stripes — so the
  // written menu reads clean and premium rather than busy. Gold gets two layers:
  // a normal-blend cream underlay that re-establishes a truly golden parchment
  // (the artwork is semi-transparent, so without it the pink glow behind the
  // card tints the parchment rosy), then a gentle multiply sheen. Silver and
  // platinum need one layer each.
  const finish: { band: string; blend: "normal" | "multiply" | "soft-light" }[] =
    popular
      ? [
          {
            band: "linear-gradient(150deg, rgba(240,208,158,0.4), rgba(240,208,158,0.28) 50%, rgba(240,208,158,0.38))",
            blend: "normal",
          },
          {
            band: "linear-gradient(150deg, rgba(240,208,158,0.46), rgba(240,208,158,0.3) 45%, rgba(240,208,158,0.42) 60%, rgba(240,208,158,0.32))",
            blend: "multiply",
          },
        ]
      : premium
        ? [
            {
              band: "linear-gradient(150deg, rgba(0,0,0,0.2), rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.17) 55%, rgba(0,0,0,0.09) 68%, rgba(0,0,0,0.16))",
              blend: "multiply",
            },
          ]
        : silver
          ? [
              {
                band: "linear-gradient(150deg, rgba(255,255,255,0.95), rgba(255,255,255,0.5) 38%, rgba(255,255,255,0.9) 52%, rgba(255,255,255,0.45) 66%, rgba(255,255,255,0.85))",
                blend: "soft-light",
              },
            ]
          : [];
  // Clips an overlay to the scroll artwork's silhouette.
  const scrollMask = {
    WebkitMaskImage: "url(/pack.png)",
    maskImage: "url(/pack.png)",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  } as const;

  return (
    <div
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "card-lift group relative flex h-full cursor-pointer flex-col items-center",
        popular ? "z-10" : selected ? "z-20" : "z-0",
      ].join(" ")}
    >
      {/* Popular ribbon — golden (brand cream) so the Gold tier reads gold,
          set off from the parchment by a thin maroon ring. Floated well above
          the artwork so it doesn't crowd the scroll's lace band. */}
      {popular && (
        <span className="absolute -top-5 z-30 whitespace-nowrap rounded-full bg-cream px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-maroon shadow-sm ring-1 ring-maroon/40">
          {t("Popular Choice", "लोकप्रिय विकल्प")}
        </span>
      )}

      {/* Premium ribbon — solid brand black ("onyx") with a star so Platinum
          reads as the top tier, distinct from Gold's golden "Popular" pill. */}
      {premium && (
        <span className="absolute -top-5 z-30 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-cream shadow-sm">
          ★ {t("Premium", "प्रीमियम")}
        </span>
      )}

      {/* ── Patra scroll artwork with the entire menu written on it ──
          [container-type:inline-size] makes this the reference for the cqw
          type/spacing units used on the parchment: all the written content
          scales with the card exactly like the artwork does, so the menu
          fits identically at every card size — nothing can clip. */}
      <div
        className={`relative w-full [container-type:inline-size] transition duration-300 ${
          selected
            ? "[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.45))]"
            : "[filter:drop-shadow(0_10px_22px_rgba(0,0,0,0.25))] group-hover:[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.32))]"
        }`}
        style={{ aspectRatio: SCROLL_RATIO }}
      >
        <Image
          src="/pack.png"
          alt=""
          fill
          sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 90vw"
          className="pointer-events-none select-none object-contain"
          priority={priority || popular}
        />

        {/* Tier finish, masked to the scroll artwork so it follows the patra's
            silhouette exactly — no rectangular wash. Blended into the artwork
            (multiply / soft-light) so the scroll's red stays rich. Rendered
            before the parchment content so the menu text keeps its ink colour. */}
        {finish.map((layer, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              ...scrollMask,
              background: layer.band,
              mixBlendMode: layer.blend,
            }}
          />
        ))}

        {/* Writable parchment area. The masked finish above only bites where
            the artwork is opaque (the red folds); the parchment pixels are
            near-transparent, so Platinum's smoky cast is painted here as a
            soft radial that fades out well before the edges (no rectangle).
            A separate masked child carries the mid-card shimmer. */}
        <div
          className={`absolute ${PARCHMENT} flex flex-col overflow-hidden`}
          style={
            premium
              ? {
                  // closest-side: the fade reaches exactly 0 AT the box edges,
                  // so no faint straight line ever shows where the box clips.
                  // Kept whisper-light — any stronger and the centre reads as
                  // a dark stain rather than a smoky platinum cast.
                  background:
                    "radial-gradient(closest-side at 50% 42%, rgba(0,0,0,0.07), rgba(0,0,0,0.045) 55%, rgba(0,0,0,0) 100%)",
                }
              : undefined
          }
        >
          {/* Selected marker — a maroon check chip pinned to the parchment's
              top-right corner so the chosen scroll is unmistakable. */}
          {selected && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-[10px] font-bold leading-none text-cream shadow-sm"
            >
              ✓
            </span>
          )}

          {/* ── Header (the "30%") — identity, price, guests, occasion. Kept
              compact and small so the written menu below owns the larger
              share of the scroll. ── */}
          <h3 className="text-center font-display text-[max(16px,5.8cqw)] leading-none tracking-wide text-maroon">
            {tierName}
          </h3>
          <p className="mt-[1cqw] text-center text-[max(9px,3.1cqw)] leading-none text-ink-soft">
            <span className="font-semibold text-maroon">@ {tier.price}</span>{" "}
            {lang === "hi" ? tier.unitHi : tier.unit}
          </p>
          {pax && (
            <p
              className={`mx-auto mt-[1.1cqw] rounded-full px-2.5 py-0.5 text-center text-[max(8px,2.7cqw)] font-semibold tracking-wide ${
                premium
                  ? "bg-ink text-cream"
                  : silver
                    ? "border border-ink/40 bg-white text-ink"
                    : "border border-maroon/30 text-maroon"
              }`}
            >
              {pax}
            </p>
          )}
          {bestFor && (
            <p className="mt-[1.1cqw] text-center text-[max(8px,2.7cqw)] leading-tight text-ink-soft">
              <span className="font-semibold text-maroon">
                {t("Perfect for", "इनके लिए परफेक्ट")}:
              </span>{" "}
              {bestFor}
            </p>
          )}

          {/* ── Menu (the "70%") — the scroll's focus. Given the dominant share
              of the parchment (flex-1), unframed — no rule bars — so the items
              read as ink written straight onto the parchment. Rows breathe
              with even spacing for a clean, premium read. The whole list shows
              at once — no inner scroll. ── */}
          <ul className="mt-[1.4cqw] flex flex-1 flex-col justify-center gap-y-[1.4cqw] pl-1 pr-1">
            {segments.map((seg) => {
              if (seg.type === "item") {
                const label =
                  lang === "hi" ? seg.feature.labelHi : seg.feature.label;
                return (
                  <li
                    key={seg.index}
                    className="flex items-start gap-2 text-left text-[max(11px,3.4cqw)] leading-tight text-ink"
                  >
                    <RhombusMarker />
                    <span>{label}</span>
                  </li>
                );
              }

              const headingLabel =
                lang === "hi" ? seg.heading.labelHi : seg.heading.label;
              const hasItems = seg.items.length > 0;
              // Full-scroll surfaces write every course out in full; only the
              // compact accordion deck collapses and toggles.
              const isOpen = accordion ? openCourses.has(seg.index) : true;
              const items = hasItems && isOpen && (
                <ul className="mt-[0.7cqw] flex flex-col gap-y-[0.7cqw]">
                  {seg.items.map(({ feature, index }) => {
                    const label =
                      lang === "hi" ? feature.labelHi : feature.label;
                    return (
                      <li
                        key={index}
                        className="pl-5 text-left text-[max(11px,3.4cqw)] leading-tight text-ink-soft"
                      >
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              );

              // Non-accordion: a plain course header with every item written
              // out beneath it — nothing hidden, no toggle chrome.
              if (!accordion) {
                return (
                  <li key={seg.index}>
                    <div className="flex items-start gap-2 text-left text-[max(11px,3.4cqw)] font-semibold leading-tight text-maroon">
                      <RhombusMarker />
                      <span className="flex-1">{headingLabel}</span>
                    </div>
                    {items}
                  </li>
                );
              }

              return (
                <li key={seg.index}>
                  {/* Course header — click to reveal its items; kept collapsed
                      by default so the compact deck stays bounded. Stops
                      propagation so expanding doesn't also select the card. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!hasItems) return;
                      e.stopPropagation();
                      toggleCourse(seg.index);
                    }}
                    aria-expanded={hasItems ? isOpen : undefined}
                    className="flex w-full items-start gap-2 rounded text-left text-[max(11px,3.4cqw)] font-semibold leading-tight text-maroon transition-colors duration-200 hover:bg-cream/50"
                  >
                    <RhombusMarker />
                    <span className="flex-1">{headingLabel}</span>
                    {hasItems && (
                      <>
                        {/* Item count — only when more than one line is hidden,
                            so a lone detail row doesn't read as a quantity. */}
                        {seg.items.length > 1 && (
                          <span className="mt-px shrink-0 rounded-full border border-maroon/25 px-1.5 text-[max(9px,2.9cqw)] font-bold leading-tight text-maroon">
                            {seg.items.length}
                          </span>
                        )}
                        {/* Plus → rotates to a cross when open; a subtle
                            "there's more" affordance. */}
                        <span
                          aria-hidden="true"
                          className={`shrink-0 text-[max(10px,3.6cqw)] leading-none text-maroon/50 transition-transform duration-200 ${
                            isOpen ? "rotate-45" : ""
                          }`}
                        >
                          +
                        </span>
                      </>
                    )}
                  </button>
                  {items}
                </li>
              );
            })}
          </ul>

          {/* Closing note — extra-small footnote type so the full sentence
              always fits above the bottom roll, on every surface. */}
          {footnote && footnote.length > 0 && (
            <div className="mt-[1cqw] text-center text-[max(8px,2.5cqw)] font-medium leading-snug text-ink-soft">
              {footnote.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          {/* Action area — inside the parchment unless placed on the fold. */}
          {!ctaOnFold && cta}
        </div>

        {/* Action area centered on the scroll's bottom red fold — matches the
            parchment's horizontal span so it lines up with the menu column.
            The fold band's visible centreline sits 7.8% up the artwork (band
            ≈ 88.4–96.0% measured from the RENDERED card, which sits a hair
            below the raw pack.png rows once scaling and the drop-shadow filter
            soften its edges). Anchoring the container's bottom at that line
            and translating down by half its own height keeps any-height CTA
            dead centre on the band at every card size. */}
        {ctaOnFold && cta && (
          <div className="absolute bottom-[7.8%] left-[13%] right-[21%] z-20 flex translate-y-1/2 justify-center">
            {cta}
          </div>
        )}
      </div>
    </div>
  );
}
