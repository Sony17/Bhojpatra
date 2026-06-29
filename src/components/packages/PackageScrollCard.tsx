"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { type PackageTier, type PackageFeature } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * The "patra scroll" package card — the menu written on the scroll artwork.
 *
 * Shared between the home page's Packages section and the booking wizard's
 * package step so both surfaces advertise a tier identically. The card renders
 * the tier's name, price, pax range, course list (collapsible) and footnote;
 * the caller supplies the action area via `cta` (a home-page Link, or a
 * booking-step select button).
 */

/** Aspect ratio of the patra scroll artwork (public/package1.png, 433×576). */
const SCROLL_RATIO = "433 / 576";

/**
 * Writable cream area of the scroll, as inset % of the artwork. The package
 * content is positioned inside this box; nudge these if text crowds the frame.
 * The horizontal insets keep the rhombus markers clear of the maroon border.
 */
const PARCHMENT = "left-[13%] right-[21%] top-[17%] bottom-[15%]";

/** Small cream rhombus marker — elegant, ringed in maroon. */
function RhombusMarker() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-cream shadow-[inset_0_0_0_1px_rgba(185,32,37,0.55)]"
    />
  );
}

/** A flat item, or a collapsible course header holding the items beneath it. */
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
  const tierName = lang === "hi" ? tier.nameHi : tier.name;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const footnote = lang === "hi" ? tier.footnoteHi : tier.footnote;

  // Group the flat feature list into course segments. A `heading` item opens a
  // collapsible course (e.g. "Main Course") holding the items that follow it.
  const segments = buildCourseSegments(tier.features);
  const [openCourses, setOpenCourses] = useState<Set<number>>(() => new Set());
  const toggleCourse = (idx: number) =>
    setOpenCourses((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

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

      {/* ── Patra scroll artwork with the menu written on its parchment ── */}
      <div
        className={`relative w-full transition duration-300 ${
          selected
            ? "[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.45))]"
            : "[filter:drop-shadow(0_10px_22px_rgba(0,0,0,0.25))] group-hover:[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.32))]"
        }`}
        style={{ aspectRatio: SCROLL_RATIO }}
      >
        <Image
          src="/package1.png"
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

          {/* Menu list — scrolls within the parchment if it overflows. */}
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

              const open = openCourses.has(seg.index);
              const headingLabel =
                lang === "hi" ? seg.heading.labelHi : seg.heading.label;
              return (
                <li
                  key={seg.index}
                  className="border-b border-maroon/10 last:border-b-0"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCourse(seg.index);
                    }}
                    className="flex w-full items-start justify-between gap-2 py-1 text-left text-[11px] font-bold leading-tight text-ink"
                  >
                    <span className="flex items-start gap-2">
                      <RhombusMarker />
                      <span>{headingLabel}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`text-sm leading-none text-maroon transition-transform duration-300 ${
                        open ? "rotate-90" : ""
                      }`}
                    >
                      ›
                    </span>
                  </button>
                  {/* Collapsible body — animates open via a 0fr→1fr grid row. */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="pb-1">
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
                    </div>
                  </div>
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
