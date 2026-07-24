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

/** Aspect ratio of the patra scroll artwork (458×670 for taller menu content). */
const SCROLL_RATIO = "458 / 670";

/**
 * Writable area of the scroll, as inset % of the artwork. The menu is
 * positioned inside this box; nudge these if text crowds the frame. The
 * horizontal insets keep text clear of the maroon border and the right-hand
 * roll; the vertical insets clear the top lace band and bottom roll.
 */
const PARCHMENT = "left-[13%] right-[21%] top-[14%] bottom-[16%]";

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
  /** Only one course open at a time — bounds menu height on compact surfaces. */
  accordion?: boolean;
}) {
  const { lang, t } = useLang();
  // Courses start collapsed so the scroll reads clean; clicking a course header
  // reveals the items beneath it (tracked by segment index).
  const [openCourses, setOpenCourses] = useState<Set<number>>(new Set());
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

  // Group the flat feature list into course segments, then write the whole
  // menu out — every course header and every item is shown (no collapsing).
  const segments = buildCourseSegments(tier.features);

  // Whole-scroll metallic finish — the palette's stand-ins for the metals:
  // brand white reads silver, brand cream reads gold, and brand black reads
  // platinum. Each is diagonal banding (the metallic read) masked to the patra
  // silhouette, BLENDED into the artwork rather than painted over it —
  // multiply deepens gold/platinum and soft-light brightens silver, so the
  // scroll's red stays saturated instead of fading under a translucent wash.
  // Custom (and any future tier) stays plain.
  // Gold gets two layers: a normal-blend cream underlay that re-establishes a
  // truly golden parchment (the artwork is semi-transparent, so without it the
  // pink glow behind the card tints the parchment rosy), then the multiply
  // banding for metallic depth. Silver and platinum need one layer each.
  const finish: { band: string; blend: "normal" | "multiply" | "soft-light" }[] =
    popular
      ? [
          {
            band: "linear-gradient(150deg, rgba(240,208,158,0.4), rgba(255,245,220,0.2) 45%, rgba(240,208,158,0.35))",
            blend: "soft-light",
          },
        ]
      : premium
        ? [
            {
              band: "linear-gradient(150deg, rgba(245,245,255,0.7), rgba(210,215,225,0.3) 45%, rgba(245,245,255,0.6))",
              blend: "soft-light",
            },
          ]
        : silver
          ? [
              {
                band: "linear-gradient(150deg, rgba(255,255,255,0.85), rgba(245,245,250,0.4) 45%, rgba(255,255,255,0.75))",
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
      {/* Silver ribbon — sleek slate/silver pill */}
      {silver && (
        <span className="absolute -top-5 z-30 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-3.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-slate-800 shadow-md border border-slate-300 ring-2 ring-slate-300/40">
          ❖ {t("Silver Tier", "सिल्वर पैकेज")}
        </span>
      )}

      {/* Popular ribbon — golden pill set off by amber/gold border */}
      {popular && (
        <span className="absolute -top-5 z-30 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-3.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-amber-950 shadow-md border border-amber-300 ring-2 ring-amber-400/50">
          ★ {t("Popular Choice", "लोकप्रिय विकल्प")}
        </span>
      )}

      {/* Premium ribbon — onyx/black pill with platinum border */}
      {premium && (
        <span className="absolute -top-5 z-30 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-zinc-900 px-3.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-cream shadow-md border border-zinc-700 ring-2 ring-zinc-500/40">
          ✦ {t("Premium Experience", "प्रीमियम एक्सपीरियंस")}
        </span>
      )}

      {/* ── Patra scroll artwork with the entire menu written on it ── */}
      <div
        className={`relative w-full transition duration-300 ${
          selected
            ? "[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.45))]"
            : "[filter:drop-shadow(0_10px_22px_rgba(0,0,0,0.22))] group-hover:[filter:drop-shadow(0_16px_30px_rgba(185,32,37,0.32))]"
        }`}
        style={{ aspectRatio: SCROLL_RATIO }}
      >
        <Image
          src="/pack.png"
          alt=""
          fill
          sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 90vw"
          className="pointer-events-none select-none object-fill"
          priority={priority || popular}
        />

        {/* Tier finish, masked to the scroll artwork */}
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

        {/* Platinum-only shimmer sweep */}
        {premium && (
          <div
            aria-hidden="true"
            className="premium-shimmer pointer-events-none absolute inset-0 opacity-40"
            style={scrollMask}
          />
        )}

        {/* Writable parchment area — kept bright for crisp 100% text contrast */}
        <div
          className={`absolute ${PARCHMENT} flex flex-col overflow-hidden rounded-md border border-maroon/20 bg-cream/10 p-1`}
        >
          {/* Selected marker */}
          {selected && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-[10px] font-bold leading-none text-cream shadow-sm"
            >
              ✓
            </span>
          )}

          {/* Title + price */}
          <h3 className="text-center font-display text-2xl font-bold leading-none tracking-wide text-maroon">
            {tierName}
          </h3>
          <p className="mt-1 text-center text-[12px] font-semibold text-ink">
            <span className="font-bold text-maroon">@ {tier.price}</span>{" "}
            <span className="text-ink/80 font-medium">
              {lang === "hi" ? tier.unitHi : tier.unit}
            </span>
          </p>
          {pax && (
            <p
              className={`mx-auto mt-1.5 rounded-full px-2.5 py-0.5 text-center text-[9.5px] font-bold tracking-wide transition-colors ${
                premium
                  ? "bg-zinc-900 text-cream border border-zinc-700 shadow-xs"
                  : popular
                    ? "bg-amber-100 text-amber-950 border border-amber-300 shadow-xs"
                    : "bg-slate-100 text-slate-900 border border-slate-300 shadow-xs"
              }`}
            >
              {pax}
            </p>
          )}

          {/* Occasion guidance */}
          {bestFor && (
            <p className="mt-1.5 text-center text-[9.5px] font-medium leading-snug text-ink/90">
              <span className="font-bold text-maroon">
                {t("Perfect for", "इनके लिए परफेक्ट")}:
              </span>{" "}
              {bestFor}
            </p>
          )}

          {/* Entire menu */}
          <ul className="mt-2 min-h-0 flex-1 overflow-y-auto pl-1 pr-1">
            {segments.map((seg) => {
              if (seg.type === "item") {
                const label =
                  lang === "hi" ? seg.feature.labelHi : seg.feature.label;
                return (
                  <li
                    key={seg.index}
                    className="flex items-start gap-2 border-b border-maroon/15 py-1 text-left text-[11px] font-semibold leading-tight text-ink last:border-b-0"
                  >
                    <RhombusMarker />
                    <span className="text-ink font-semibold">{label}</span>
                  </li>
                );
              }

              const headingLabel =
                lang === "hi" ? seg.heading.labelHi : seg.heading.label;
              const hasItems = seg.items.length > 0;
              const isOpen = openCourses.has(seg.index);
              return (
                <li
                  key={seg.index}
                  className="border-b border-maroon/15 py-1 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!hasItems) return;
                      e.stopPropagation();
                      toggleCourse(seg.index);
                    }}
                    aria-expanded={hasItems ? isOpen : undefined}
                    className="flex w-full items-start gap-2 rounded text-left text-[11px] font-bold leading-tight text-maroon transition-colors duration-200 hover:bg-cream/50"
                  >
                    <RhombusMarker />
                    <span className="flex-1 font-bold text-maroon">
                      {headingLabel}
                    </span>
                    {hasItems && (
                      <>
                        {seg.items.length > 1 && (
                          <span className="mt-px shrink-0 rounded-full border border-maroon/40 bg-maroon/10 px-1.5 text-[9px] font-bold leading-tight text-maroon">
                            {seg.items.length}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 shrink-0 text-sm font-bold leading-none text-maroon transition-transform duration-200 ${
                            isOpen ? "rotate-45" : ""
                          }`}
                        >
                          +
                        </span>
                      </>
                    )}
                  </button>
                  {hasItems && isOpen && (
                    <ul className="mt-0.5">
                      {seg.items.map(({ feature, index }) => {
                        const label =
                          lang === "hi" ? feature.labelHi : feature.label;
                        return (
                          <li
                            key={index}
                            className="py-0.5 pl-5 text-left text-[11px] font-medium leading-tight text-ink/85"
                          >
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Closing note */}
          {footnote && footnote.length > 0 && (
            <div className="mt-1.5 text-center text-[10px] font-semibold leading-tight text-ink/80">
              {footnote.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          {/* Action area */}
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
