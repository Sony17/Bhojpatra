"use client";

import { useState } from "react";
import Link from "next/link";
import { packages } from "@/lib/data";
import Reveal from "@/components/Reveal";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import TierDifferentiator from "@/components/packages/TierDifferentiator";
import { useLang } from "@/lib/i18n";
import { useSiteContent } from "@/lib/sitePages";
import { useHomeContent } from "@/lib/homeContent";
import { Button } from "@/components/ui";

export default function Packages() {
  const { lang, t } = useLang();
  const { contact } = useSiteContent();
  const { packages: homePackages } = useHomeContent();
  const waText = t(
    "Hi Bhojpatra, none of the packages quite fit my event — I'd like a curated package.",
    "नमस्ते भोजपत्र, कोई भी पैकेज मेरे इवेंट के लिए पूरी तरह फिट नहीं है — मुझे एक कस्टम पैकेज चाहिए।",
  );
  const waLink = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(waText)}`;
  // The three headline tiers ride the patra scrolls; Single Stall (the "custom"
  // tier) is surfaced separately, below the grid, as a premium banner — its full
  // build-your-own flow still lives in /book.
  // Admin-editable name / price (from the home-content store) override the
  // seed values; the menu structure stays sourced from `data.ts`.
  const applyMeta = (p: (typeof packages)[number]) => {
    const meta = homePackages.tiers.find((x) => x.id === p.id);
    return meta
      ? { ...p, name: meta.name, nameHi: meta.nameHi, price: meta.price }
      : p;
  };
  const tiers = packages.filter((p) => p.id !== "custom").map(applyMeta);
  const singleStall = (() => {
    const raw = packages.find((p) => p.id === "custom");
    return raw ? applyMeta(raw) : null;
  })();
  // Pre-select the popular tier so a highlight is visible by default.
  const [selectedId, setSelectedId] = useState<string>(
    tiers.find((p) => p.popular)?.id ?? tiers[0].id,
  );

  const selectedTier = tiers.find((p) => p.id === selectedId) ?? tiers[0];

  // One tier scroll + its "Book" fold CTA — shared by the mobile single-card
  // view and the desktop side-by-side grid so both render an identical card.
  const renderCard = (tier: (typeof tiers)[number], isSelected: boolean) => {
    const tierName = lang === "hi" ? tier.nameHi : tier.name;
    return (
      <PackageScrollCard
        tier={tier}
        selected={isSelected}
        onSelect={() => setSelectedId(tier.id)}
        priority={tier.popular}
        ctaOnFold
        cta={
          <Link
            href={`/book?package=${tier.id}&step=menu`}
            onClick={() => setSelectedId(tier.id)}
            aria-label={`${t("Book", "बुक करें")} ${tierName}`}
            className="btn-sheen inline-flex h-8 items-center gap-1.5 rounded-full bg-cream px-4 text-[13px] font-semibold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition-all duration-300 hover:brightness-105 active:scale-95"
          >
            <span className="font-display leading-none">
              {t("Book", "बुक करें")} {tierName}
            </span>
            <span aria-hidden="true" className="text-sm leading-none">
              →
            </span>
          </Link>
        }
      />
    );
  };

  return (
    <section
      id="packages"
      className="relative overflow-hidden py-20 sm:py-24"
    >
      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {lang === "hi" ? homePackages.headingHi : homePackages.heading}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
            {lang === "hi" ? homePackages.subtitleHi : homePackages.subtitle}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        {/* ── Tier selector — three buttons (Silver / Gold / Platinum) in a
            cream segmented control. Tapping one swaps the single scroll below
            to that tier. Mobile only — the desktop grid shows every tier at
            once, so no selector is needed there. ── */}
        <Reveal className="mx-auto mt-12 flex max-w-md items-stretch justify-center gap-1.5 rounded-full border border-maroon/20 bg-cream/40 p-1.5 shadow-card sm:hidden">
          {tiers.map((tier) => {
            const active = tier.id === selectedId;
            const tierName = lang === "hi" ? tier.nameHi : tier.name;
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(tier.id)}
                className={[
                  "flex-1 rounded-full px-4 py-2.5 text-sm tracking-wide transition-all duration-300",
                  active
                    ? "bg-maroon text-cream shadow-card"
                    : "text-maroon hover:bg-cream/70 active:scale-95",
                ].join(" ")}
              >
                <span className="font-display leading-none">{tierName}</span>
              </button>
            );
          })}
        </Reveal>

        {/* ── Mobile single scroll — only the selected tier is rendered; the
            parchment artwork is semi-transparent, so layering the other tiers
            behind it (even dimmed) bled their text through the front card.
            Re-keying on the tier fades the fresh card in on every switch.
            Hidden on sm+, where the side-by-side grid below takes over. ── */}
        <Reveal className="-mx-5 mt-12 sm:hidden">
          <div
            key={selectedTier.id}
            className="animate-fade mx-auto w-full max-w-md px-1"
          >
            {renderCard(selectedTier, true)}
          </div>
        </Reveal>

        {/* ── Desktop grid — the previous layout: all three tiers laid out side
            by side (two columns on sm, three on lg). Hidden on mobile, where the
            stacked deck above takes over. ── */}
        <Reveal
          stagger
          from="right"
          className="mx-auto mt-14 hidden max-w-7xl gap-7 sm:grid sm:grid-cols-2 lg:grid-cols-3"
        >
          {tiers.map((tier) => (
            <div key={tier.id}>{renderCard(tier, tier.id === selectedId)}</div>
          ))}
        </Reveal>

        {/* ── Single Stall — one verified stall serving its own fixed menu,
            surfaced beneath the three headline scrolls as one premium banner
            (its full flow lives in /book/stall). Styled like an engraved
            invitation — an inset maroon
            hairline frame on a warm cream-washed surface with an ornament
            flourish — so it reads elevated and bespoke without a heavy colour
            block. ── */}
        {singleStall && (
          <Reveal className="mx-auto mt-12 max-w-5xl sm:mt-14">
            <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-cream/40 via-white to-cream/30 shadow-card ring-1 ring-maroon/15">
              {/* Inset hairline frame — the "engraved" premium cue. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[7px] rounded-[0.6rem] border border-maroon/20"
              />
              {/* Soft cream corner glow for warmth (alpha on brand cream). */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cream/50 blur-2xl"
              />

              <div className="relative flex flex-col gap-7 p-8 sm:p-10 lg:flex-row lg:items-center lg:gap-10">
                {/* Identity · price · CTA */}
                <div className="text-center lg:max-w-xs lg:shrink-0 lg:text-left">
                  <p className="eyebrow text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    {t("One Verified Vendor", "एक वेरिफाइड वेंडर")}
                  </p>
                  <h3 className="mt-2 font-display text-3xl leading-none tracking-wide text-maroon sm:text-4xl">
                    {lang === "hi" ? singleStall.nameHi : singleStall.name}
                  </h3>
                  <Ornament className="mx-auto mt-4 text-maroon/50 lg:mx-0" />
                  {singleStall.tagline && (
                    <p className="font-script mt-3 text-lg text-ink-soft">
                      {lang === "hi" ? singleStall.taglineHi : singleStall.tagline}
                    </p>
                  )}
                  {/* Same tier differentiator the three scrolls carry, so the
                      Single Stall banner sits on the same ladder rather than
                      reading as an unrelated offer. */}
                  <TierDifferentiator
                    claims={
                      (lang === "hi"
                        ? singleStall.differentiatorHi
                        : singleStall.differentiator) ?? []
                    }
                    className="mt-3 justify-center lg:justify-start"
                  />
                  <p className="mt-4 text-sm text-ink-soft">
                    <span className="text-2xl font-semibold text-maroon">
                      {singleStall.price}
                    </span>{" "}
                    {lang === "hi" ? singleStall.unitHi : singleStall.unit}
                  </p>
                  {/* Single Stall starts by choosing the stall, and stalls are
                      browsed on the Brands page — the wizard is entered from a
                      brand's own Book Now. */}
                  <Link
                    href="/vendors?category=single-stall"
                    aria-label={t("Book a Single Stall", "सिंगल स्टॉल बुक करें")}
                    className="btn-sheen mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-maroon px-6 text-sm font-semibold tracking-wide text-cream shadow-card ring-1 ring-maroon/30 transition-all duration-300 hover:brightness-110 active:scale-95"
                  >
                    <span className="font-display leading-none">
                      {t("Book a Single Stall", "सिंगल स्टॉल बुक करें")}
                    </span>
                    <span aria-hidden="true" className="leading-none">
                      →
                    </span>
                  </Link>
                </div>

                {/* Hairline divider — vertical on lg, horizontal when stacked. */}
                <span
                  aria-hidden="true"
                  className="h-px w-full bg-maroon/15 lg:h-40 lg:w-px"
                />

                {/* What it includes */}
                <div className="lg:flex-1">
                  {singleStall.bestFor && (
                    <p className="text-center text-sm font-semibold text-maroon lg:text-left">
                      {t("Perfect for", "इनके लिए परफेक्ट")}:{" "}
                      <span className="font-normal text-ink-soft">
                        {lang === "hi" ? singleStall.bestForHi : singleStall.bestFor}
                      </span>
                    </p>
                  )}
                  <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {singleStall.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm leading-snug text-ink"
                      >
                        {/* Cream rhombus ringed in maroon — the same elegant
                            marker the tier scrolls use. */}
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-cream shadow-[inset_0_0_0_1px_rgba(185,32,37,0.55)]"
                        />
                        <span>{lang === "hi" ? f.labelHi : f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Curated-package option — when no tier fits, reach out on WhatsApp.
            The price disclaimer is clubbed in beneath as a small un-boxed
            footnote (rather than its own bordered block) so the section tail
            stays compact. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-col items-center gap-4 rounded-card border border-maroon/20 bg-cream/40 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-soft">
              {t(
                "None of these fit, or want a package curated just for you?",
                "इनमें से कोई फिट नहीं है, या अपने लिए एक खास पैकेज बनवाना चाहते हैं?",
              )}{" "}
              <span className="font-display text-maroon">
                {t("Contact Bhojpatra.", "भोजपत्र से संपर्क करें।")}
              </span>
            </p>
            <Button
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              leftIcon={<WhatsAppIcon className="h-4 w-4" />}
            >
              <span className="font-display">
                {t("Chat on WhatsApp", "व्हाट्सएप पर चैट करें")}
              </span>
            </Button>
          </div>
          {/* Disclaimer — small un-boxed footnote clubbed under the box above. */}
          <p className="mt-3 px-2 text-center text-xs text-ink-soft">
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
