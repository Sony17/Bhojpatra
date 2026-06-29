"use client";

import { useState } from "react";
import Link from "next/link";
import { packages, type PackageTier } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

export default function Packages() {
  const { t } = useLang();
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
          <h2 className="text-3xl text-ink sm:text-4xl">
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
          className="mx-auto mt-12 grid max-w-6xl grid-cols-1 items-center gap-7 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
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
  const tagline = lang === "hi" ? tier.taglineHi : tier.tagline;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const footnote = lang === "hi" ? tier.footnoteHi : tier.footnote;

  return (
    <div
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "card-lift group relative z-0 flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border p-8 transition sm:p-9",
        popular ? "z-10 lg:-my-4 lg:py-12" : "",
        // Background + border + ring resolve by state. Selected goes warm cream;
        // unselected cards (including the popular tier) stay white.
        selected
          ? "z-20 border-maroon bg-gradient-to-b from-cream to-cream-2 ring-2 ring-maroon shadow-[0_30px_64px_-20px_rgba(185,32,37,0.5)]"
          : popular
            ? "border-maroon/60 bg-white ring-1 ring-maroon/25 shadow-[0_28px_60px_-20px_rgba(185,32,37,0.4)]"
            : "border-maroon/20 bg-white shadow-[0_16px_44px_-26px_rgba(0,0,0,0.35)]",
      ].join(" ")}
    >
      {/* Badge row — fixed height keeps every card's content baseline aligned. */}
      <div className="relative z-20 mb-2 flex h-6 items-center justify-center">
        {popular && (
          <span className="rounded-full bg-maroon px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-cream shadow-sm">
            {t("Popular Choice", "लोकप्रिय विकल्प")}
          </span>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Title + price */}
        <h3 className="text-center font-display text-3xl tracking-wide text-maroon">
          {tierName}
        </h3>
        <p className="mt-2 text-center text-sm text-ink-soft">
          <span className="font-semibold text-maroon">@ {tier.price}</span>{" "}
          {lang === "hi" ? tier.unitHi : tier.unit}
        </p>

        {/* Guest-count range this package serves. */}
        {pax && (
          <p className="mx-auto mt-3 rounded-full border border-maroon/20 bg-cream/40 px-3 py-1 text-center text-xs font-semibold tracking-wide text-maroon">
            {pax}
          </p>
        )}

        {/* Tagline divider — a centred label flanked by hairlines. */}
        {tagline && (
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-maroon/15" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
              {tagline}
            </span>
            <span className="h-px flex-1 bg-maroon/15" />
          </div>
        )}

        {/* Feature rows — heading items render bold, others get a chevron. */}
        <ul className="mt-5 flex flex-1 flex-col">
          {tier.features.map((feature, i) => {
            const label = lang === "hi" ? feature.labelHi : feature.label;
            if (feature.heading) {
              return (
                <li
                  key={i}
                  className="pb-1 pt-3 text-left text-sm font-bold text-ink"
                >
                  {label}
                </li>
              );
            }
            return (
              <li
                key={i}
                className="flex items-start gap-3 border-b border-maroon/10 py-2.5 text-left text-sm text-ink last:border-b-0"
              >
                <span aria-hidden="true" className="mt-px text-maroon">
                  ›
                </span>
                <span>{label}</span>
              </li>
            );
          })}
        </ul>

        {/* Closing note */}
        {footnote && footnote.length > 0 && (
          <div className="mt-6 text-center text-sm font-medium text-ink-soft">
            {footnote.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {/* CTA — selecting a package carries it into the booking flow and lands
            on vendor selection (Step 2 of /book) so the guest continues straight
            into their order. */}
        <div className="mt-7">
          <Link
            href={`/book?package=${tier.id}&step=menu`}
            onClick={onSelect}
            className="btn-sheen block w-full rounded-xl bg-maroon px-5 py-3 text-center text-sm font-semibold tracking-wide text-cream shadow-sm transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            {selected
              ? `${t("Continue", "जारी रखें")} ${tierName} →`
              : `${t("Select", "चुनें")} ${tierName}`}
          </Link>
        </div>
      </div>
    </div>
  );
}
