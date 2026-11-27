"use client";

import { useState } from "react";
import Link from "next/link";
import { packages } from "@/lib/data";
import Reveal from "@/components/Reveal";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import TierDifferentiator from "@/components/packages/TierDifferentiator";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import FeastInterestPopup from "@/components/sections/FeastInterest";
import { CuratedEnquiryForm } from "@/components/sections/CuratedEnquiry";
import { FEAST_BOOKING_OPEN } from "@/lib/launchFlags";

/** `compactSubtitle`: the subtitle in small body text across a wider line
 * instead of the large script face (used by /home-recreate). */
export default function Packages({
  compactSubtitle = false,
  singleStallBanner = true,
}: {
  compactSubtitle?: boolean;
  /** false hides the Single Stall banner under the tiers (used by /home-recreate). */
  singleStallBanner?: boolean;
}) {
  const { lang, t } = useLang();
  const { packages: homePackages } = useHomeContent();
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestPackageId, setInterestPackageId] = useState("");
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
  const bookCtaClass =
    "btn-sheen inline-flex h-8 items-center gap-1.5 rounded-full bg-cream px-4 text-[13px] font-semibold tracking-wide text-maroon shadow-card ring-1 ring-maroon/30 transition-all duration-300 hover:brightness-105 active:scale-95";

  const openFeastInterest = (tierId: string) => {
    setSelectedId(tierId);
    setInterestPackageId(tierId);
    setInterestOpen(true);
  };

  const renderCard = (tier: (typeof tiers)[number], isSelected: boolean) => {
    const tierName = lang === "hi" ? tier.nameHi : tier.name;
    const bookLabel = `${t("Book", "बुक करें")} ${tierName}`;
    return (
      <PackageScrollCard
        tier={tier}
        selected={isSelected}
        onSelect={() => setSelectedId(tier.id)}
        priority={tier.popular}
        ctaOnFold
        cta={
          FEAST_BOOKING_OPEN ? (
            <Link
              href={`/book?package=${tier.id}&step=menu`}
              onClick={() => setSelectedId(tier.id)}
              aria-label={bookLabel}
              className={bookCtaClass}
            >
              <span className="font-display leading-none">{bookLabel}</span>
              <span aria-hidden="true" className="text-sm leading-none">
                →
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openFeastInterest(tier.id)}
              aria-label={bookLabel}
              className={bookCtaClass}
            >
              <span className="font-display leading-none">{bookLabel}</span>
              <span aria-hidden="true" className="text-sm leading-none">
                →
              </span>
            </button>
          )
        }
      />
    );
  };

  return (
    <>
    <section
      id="packages"
      className="relative overflow-hidden py-20 sm:py-24"
    >
      <div className="relative w-full px-5 sm:px-8 lg:px-12">
        <Reveal className={"mx-auto text-center " + (compactSubtitle ? "max-w-6xl" : "max-w-2xl")}>
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {lang === "hi" ? homePackages.headingHi : homePackages.heading}
          </h2>
          <p
            className={
              compactSubtitle
                ? "mx-auto mt-2 text-[13px] leading-snug text-ink/70 sm:text-sm"
                : "font-script mt-4 text-xl text-ink-soft sm:text-2xl"
            }
          >
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
        {singleStallBanner && singleStall && (
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
                    {t("One Trusted Caterer", "एक भरोसेमंद कैटरर")}
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

        {/* Curated-package option — when no tier fits, reach out on WhatsApp,
            optionally attaching a menu & budget PDF that travels with the
            enquiry as a link. The price disclaimer is clubbed in beneath as a
            small un-boxed footnote (rather than its own bordered block) so the
            section tail stays compact. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <CuratedEnquiryForm />
          {/* Disclaimer — small un-boxed footnote clubbed under the box above.
              The dish counts on the scrolls are the platform's standard per
              tier; a caterer can publish their own for a course (and price it
              apart), so the booking flow may show a different number against a
              given brand. Said here rather than left for the guest to discover. */}
          <p className="mt-3 px-2 text-center text-xs text-ink-soft">
            {t(
              "Prices are approximate. The final price depends on the menu and caterers you choose. Dish counts shown are our standard for each package — some caterers serve more (or fewer) from a course, shown on their card while booking.",
              "कीमतें अनुमानित हैं। अंतिम कीमत आपके चुने मेन्यू और कैटरर पर निर्भर करती है। दिखाई गई डिश संख्या हर पैकेज के लिए हमारा मानक है — कुछ कैटरर किसी कोर्स से इससे ज़्यादा (या कम) परोसते हैं, जो बुकिंग के समय उनके कार्ड पर दिखेगा।",
            )}
          </p>
        </Reveal>
      </div>
    </section>
    {!FEAST_BOOKING_OPEN && (
      <FeastInterestPopup
        open={interestOpen}
        onClose={() => setInterestOpen(false)}
        initialPackageId={interestPackageId}
      />
    )}
    </>
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
