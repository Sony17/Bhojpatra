"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { packages, type PackageTier, type PackageFeature } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";

export default function Packages() {
  const { t } = useLang();
  const { contact } = useSiteContent();
  const waText = t(
    "Hi Bhojpatra, none of the packages quite fit my event — I'd like a curated package.",
    "नमस्ते भोजपत्र, कोई भी पैकेज मेरे इवेंट के लिए पूरी तरह फिट नहीं है — मुझे एक कस्टम पैकेज चाहिए।",
  );
  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waText)}`;
  // Only the three headline tiers are shown here — Custom lives in the booking flow.
  const tiers = packages.filter((p) => p.id !== "custom");
  // Pre-select the popular tier so a highlight is visible by default.
  const [selectedId, setSelectedId] = useState<string>(
    tiers.find((p) => p.popular)?.id ?? tiers[0].id,
  );

  return (
    <section
      id="packages"
      className="relative overflow-hidden bg-gradient-to-b from-surface-beige to-surface-beige-2 py-20 sm:py-24"
    >
      {/* Soft brand-warm glow on the beige band. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-maroon/[0.06] blur-[140px]" />
      </div>

      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl text-maroon sm:text-4xl">
            {t("Select Your Package", "अपना पैकेज चुनें")}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
            {t(
              "Choose a package as per your preference.",
              "अपनी पसंद के अनुसार एक पैकेज चुनें।",
            )}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        <Reveal
          stagger
          from="right"
          className="mx-auto mt-12 grid max-w-6xl grid-cols-1 items-stretch gap-7 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
        >
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              selected={tier.id === selectedId}
              onSelect={() => setSelectedId(tier.id)}
            />
          ))}
        </Reveal>

        {/* Curated-package option — when no tier fits, reach out on WhatsApp. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-maroon/20 bg-cream/40 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-soft">
              {t(
                "None of these fit, or want a package curated just for you?",
                "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?",
              )}{" "}
              <span className="font-display text-maroon">
                {t("Contact Bhojpatra.", "भोजपत्र से संपर्क करें।")}
              </span>
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sheen inline-flex shrink-0 items-center gap-2 rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="font-display">
                {t("Chat on WhatsApp", "व्हाट्सएप पर चैट करें")}
              </span>
            </a>
          </div>
        </Reveal>

        {/* Disclaimer — echoes the reference footer note. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <p className="rounded-2xl border border-maroon/15 bg-cream/30 px-5 py-3 text-center text-sm text-ink-soft">
            {t(
              "Prices are approximate. Final price may vary as per menu & vendor selection.",
              "कीमतें अनुमानित हैं। अंतिम कीमत मेन्यू और वेंडर के चयन के अनुसार बदल सकती है।",
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** WhatsApp glyph — rendered in a single brand colour via currentColor. */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.46 9.46 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.45 9.45 0 01-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 012.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.36 11.36 0 0012.04.5C5.76.5.65 5.61.65 11.89c0 2.01.53 3.98 1.53 5.71L.5 23.5l6.05-1.59a11.35 11.35 0 005.49 1.4h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05z" />
    </svg>
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

/** Aspect ratio of the patra scroll artwork (public/package.png, 441×566). */
const SCROLL_RATIO = "441 / 566";

/**
 * Writable cream area of the scroll, as inset % of the artwork. The package
 * content is positioned inside this box; nudge these if text crowds the frame.
 */
const PARCHMENT = "left-[22%] right-[26%] top-[15%] bottom-[14%]";

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

function PricingCard({
  tier,
  selected,
  onSelect,
}: {
  tier: PackageTier;
  selected: boolean;
  onSelect: () => void;
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
          src="/package.png"
          alt=""
          fill
          sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 90vw"
          className="pointer-events-none select-none object-contain"
          priority={popular}
        />

        {/* Writable parchment area */}
        <div className={`absolute ${PARCHMENT} flex flex-col`}>
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
          <ul className="mt-2 flex-1 overflow-y-auto pr-1">
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

          {/* Closing note */}
          {footnote && footnote.length > 0 && (
            <div className="mt-1.5 text-center text-[10px] font-medium leading-tight text-ink-soft">
              {footnote.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA — sits below the scroll; carries the package into the booking flow. */}
      <div className="mt-4 w-full px-1">
        <Link
          href={`/book?package=${tier.id}&step=menu`}
          onClick={onSelect}
          className="btn-sheen block w-full rounded-xl bg-maroon px-5 py-2.5 text-center text-sm font-semibold tracking-wide text-cream shadow-sm transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
        >
          {selected
            ? `${t("Continue", "जारी रखें")} ${tierName} →`
            : `${t("Select", "चुनें")} ${tierName}`}
        </Link>
      </div>
    </div>
  );
}
