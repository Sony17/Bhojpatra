"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { type PackageTier, type PackageFeature } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * The "patra scroll" package card — the entire menu written on the clean scroll
 * artwork (public/clean.png).
 *
 * Shared between the home page's Packages section and the booking wizard's
 * package step so both surfaces advertise a tier identically. The card renders
 * the tier's name, price, pax range, the full course/item list and footnote;
 * the caller supplies the action area via `cta` (a home-page Link, or a
 * booking-step select button).
 */

/** Aspect ratio of the patra scroll artwork (public/clean.png, 1149×1369). */
const SCROLL_RATIO = "1149 / 1369";

/**
 * Writable area of the scroll, as inset % of the artwork. The menu is
 * positioned inside this box; nudge these if text crowds the frame. The
 * horizontal insets keep text clear of the maroon border and the right-hand
 * roll; the vertical insets clear the top lace band and bottom roll.
 */
const PARCHMENT = "left-[13%] right-[21%] top-[16%] bottom-[16%]";

/** Small cream rhombus marker — elegant, ringed in maroon. */
function RhombusMarker() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-cream shadow-[inset_0_0_0_1px_rgba(185,32,37,0.55)]"
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
  priority = false,
}: {
  tier: PackageTier;
  selected: boolean;
  onSelect: () => void;
  /** Action area rendered on the parchment, below the menu (Link / button). */
  cta: ReactNode;
  /** Eager-load the scroll image (use for the popular / above-the-fold card). */
  priority?: boolean;
}) {
  const { lang, t } = useLang();
  const popular = tier.popular === true;
  const premium = tier.id === "platinum";
  const tierName = lang === "hi" ? tier.nameHi : tier.name;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const footnote = lang === "hi" ? tier.footnoteHi : tier.footnote;

  // Group the flat feature list into course segments, then write the whole
  // menu out — every course header and every item is shown (no collapsing).
  const segments = buildCourseSegments(tier.features);

  return (
    <div
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "card-lift group relative flex h-full cursor-pointer flex-col items-center",
        popular ? "z-10" : selected ? "z-20" : "z-0",
      ].join(" ")}
    >
      {/* Popular ribbon floating above the scroll's top roll. */}
      {popular && (
        <span className="absolute -top-2 z-30 rounded-full bg-maroon px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-cream shadow-sm">
          {t("Popular Choice", "लोकप्रिय विकल्प")}
        </span>
      )}

      {/* Premium ribbon — inverted (cream on maroon ring) so Platinum reads as
          the top tier, distinct from Gold's solid "Popular" pill. */}
      {premium && (
        <span className="absolute -top-2 z-30 inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-maroon shadow-sm ring-1 ring-maroon/40">
          ★ {t("Premium", "प्रीमियम")}
        </span>
      )}

      {/* ── Patra scroll artwork with the entire menu written on it ── */}
      <div
        className={`relative w-full transition duration-300 ${
          premium ? "premium-shimmer" : ""
        } ${
          selected
            ? "[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.45))]"
            : "[filter:drop-shadow(0_10px_22px_rgba(0,0,0,0.25))] group-hover:[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.32))]"
        }`}
        style={{ aspectRatio: SCROLL_RATIO }}
      >
        <Image
          src="/clean.png"
          alt=""
          fill
          sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 90vw"
          className="pointer-events-none select-none object-contain"
          priority={priority || popular}
        />

        {/* Writable parchment area */}
        <div className={`absolute ${PARCHMENT} flex flex-col overflow-hidden`}>
          {/* Title + price */}
          <h3 className="text-center font-display text-2xl leading-none tracking-wide text-maroon">
            {tierName}
          </h3>
          <p className="mt-1 text-center text-[11px] text-ink-soft">
            <span className="font-semibold text-maroon">@ {tier.price}</span>{" "}
            {lang === "hi" ? tier.unitHi : tier.unit}
          </p>
          {pax && (
            <p className="mx-auto mt-1.5 rounded-full border border-maroon/30 px-2 py-0.5 text-center text-[9px] font-semibold tracking-wide text-maroon">
              {pax}
            </p>
          )}

          {/* Entire menu — every course and item written out. Scrolls within
              the parchment only if a very long tier overflows the frame. */}
          <ul className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            {segments.map((seg) => {
              if (seg.type === "item") {
                const label =
                  lang === "hi" ? seg.feature.labelHi : seg.feature.label;
                return (
                  <li
                    key={seg.index}
                    className="flex items-start gap-2 border-b border-maroon/10 py-1 text-left text-[11px] leading-tight text-ink last:border-b-0"
                  >
                    <RhombusMarker />
                    <span>{label}</span>
                  </li>
                );
              }

              const headingLabel =
                lang === "hi" ? seg.heading.labelHi : seg.heading.label;
              return (
                <li
                  key={seg.index}
                  className="border-b border-maroon/10 py-1 last:border-b-0"
                >
                  {/* Course header */}
                  <div className="flex items-start gap-2 text-left text-[11px] font-semibold leading-tight text-maroon">
                    <RhombusMarker />
                    <span>{headingLabel}</span>
                  </div>
                  {/* Every item under this course, always shown. */}
                  <ul className="mt-0.5">
                    {seg.items.map(({ feature, index }) => {
                      const label =
                        lang === "hi" ? feature.labelHi : feature.label;
                      return (
                        <li
                          key={index}
                          className="py-0.5 pl-5 text-left text-[11px] leading-tight text-ink-soft"
                        >
                          <span>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>

          {/* Closing note — sits just above the CTA, inside the parchment. */}
          {footnote && footnote.length > 0 && (
            <div className="mt-1.5 text-center text-[10px] font-medium leading-tight text-ink-soft">
              {footnote.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          {/* Action area — supplied by the caller (Link on home, button in book). */}
          {cta}
        </div>
      </div>
    </div>
  );
}
