"use client";

import { type ReactNode } from "react";
import { type PackageTier } from "@/lib/data";
import PackageScrollCard from "@/components/packages/PackageScrollCard";
import { useLang } from "@/lib/i18n";

export type CascadeTierItem = {
  tier: PackageTier;
  tooSoon?: boolean;
  lead?: number;
  unlock?: string;
};

const DECK_TRANSFORMS = [
  "translate3d(0,0,0) scale(1) rotate(0deg)",
  "translate3d(6%,-4.5%,0) scale(0.94) rotate(2.5deg)",
  "translate3d(12%,-9%,0) scale(0.88) rotate(5deg)",
];

export default function PackageCascadeStack({
  tiers,
  selectedId,
  onSelectTier,
  renderCta,
  renderNoticeBelow,
}: {
  tiers: CascadeTierItem[];
  selectedId: string;
  onSelectTier: (id: string) => void;
  renderCta: (tier: PackageTier, selected: boolean) => ReactNode;
  renderNoticeBelow?: (item: CascadeTierItem) => ReactNode;
}) {
  const { lang, t } = useLang();

  // Find index of the currently active tier among the cascade tiers
  const activeIndex = Math.max(
    0,
    tiers.findIndex((item) => item.tier.id === selectedId),
  );

  const activeItem = tiers[activeIndex] ?? tiers[0];
  const count = tiers.length;

  return (
    <div className="w-full">
      {/* ── MOBILE VIEW (< sm): Physical Cascading Scroll Deck (from Sony's prototype) ── */}
      <div className="block select-none sm:hidden">
        {/* Tier Pills Navigation */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5">
          {tiers.map((item) => {
            const isSelected = item.tier.id === selectedId;
            const tierId = item.tier.id;
            const name = lang === "hi" ? item.tier.nameHi : item.tier.name;

            return (
              <button
                key={tierId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectTier(tierId)}
                className={`rounded-full px-5 py-2 font-display text-xs font-bold tracking-wide transition-all duration-300 active:scale-95 ${
                  isSelected
                    ? "bg-maroon text-cream shadow-card ring-1 ring-cream"
                    : "border border-maroon/25 bg-white text-maroon hover:bg-cream/40"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* The Overlapped Deck Container — single card footprint */}
        <div
          className="relative mx-auto mt-[92px] w-[min(88vw,420px)] -translate-x-[4%]"
          style={{ aspectRatio: "458 / 670" }}
        >
          {/* Soft brand glow behind the deck */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(185,32,37,0.08),rgba(185,32,37,0)_72%)]"
          />

          {tiers.map((item, i) => {
            const depth = (i - activeIndex + count) % count;
            const front = depth === 0;
            const isSelected = item.tier.id === selectedId;
            const tierName = lang === "hi" ? item.tier.nameHi : item.tier.name;

            return (
              <div
                key={item.tier.id}
                className={`absolute inset-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform origin-top-right ${
                  front ? "" : "[&_span.-top-5]:hidden"
                }`}
                style={{
                  transform: DECK_TRANSFORMS[depth] ?? DECK_TRANSFORMS[0],
                  zIndex: 30 - depth * 10,
                }}
              >
                {/* Opaque white backing under paper area — prevents bleed-through */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-[14%] left-[11%] right-[19%] top-[13.5%] rounded-[28px] bg-white"
                />

                {item.tooSoon ? (
                  <div className="relative">
                    <div className="select-none opacity-60">
                      <PackageScrollCard
                        tier={item.tier}
                        selected={false}
                        onSelect={() => {
                          if (!front) onSelectTier(item.tier.id);
                        }}
                        accordion
                        ctaOnFold
                        cta={<span aria-hidden="true" />}
                      />
                    </div>
                    {front && (
                      <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream shadow-card">
                          <span aria-hidden="true">🔒</span>
                          {t("Locked", "लॉक")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <PackageScrollCard
                    tier={item.tier}
                    selected={isSelected}
                    onSelect={() => {
                      if (!front) onSelectTier(item.tier.id);
                    }}
                    accordion
                    ctaOnFold
                    cta={front ? renderCta(item.tier, isSelected) : null}
                  />
                )}

                {/* White veil overlay on rear waiting cards — blanks internal menu & CTAs,
                    displaying tier name and price along the visible top-right peeking edge */}
                <div
                  onClick={front ? undefined : () => onSelectTier(item.tier.id)}
                  className={`absolute bottom-[14%] left-[11%] right-[19%] top-[13.5%] z-40 rounded-[28px] bg-white transition-opacity duration-300 ${
                    front
                      ? "pointer-events-none opacity-0"
                      : "cursor-pointer opacity-100"
                  }`}
                >
                  <span className="absolute right-6 top-1.5 font-display text-xs font-bold tracking-wide text-maroon">
                    {tierName} · @ {item.tier.price}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Independent Peeking Hit Targets for exposed rear scrolls */}
          {tiers.map((item, i) => {
            const depth = (i - activeIndex + count) % count;
            if (depth === 0) return null;
            const tierName = lang === "hi" ? item.tier.nameHi : item.tier.name;

            return (
              <button
                key={`hit-${item.tier.id}`}
                type="button"
                aria-label={t(`Select ${tierName}`, `${tierName} चुनें`)}
                onClick={() => onSelectTier(item.tier.id)}
                className="absolute inset-x-0 top-0 cursor-pointer select-none rounded-t-[28px] transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform origin-top-right focus:outline-none"
                style={{
                  transform: DECK_TRANSFORMS[depth] ?? DECK_TRANSFORMS[0],
                  // Depth 2 (furthest back) receives zIndex 50, Depth 1 (middle) receives zIndex 40
                  zIndex: 30 + (count - depth) * 10,
                  height: depth === 2 ? "20%" : "18%",
                }}
              />
            );
          })}
        </div>

        {/* Rhombus Pagination Markers */}
        <div
          className="mt-8 flex items-center justify-center gap-3.5"
          aria-hidden="true"
        >
          {tiers.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.tier.id}
                type="button"
                aria-label={item.tier.name}
                aria-pressed={isActive}
                onClick={() => onSelectTier(item.tier.id)}
                className={`h-2.5 w-2.5 rotate-45 transition-all duration-300 ${
                  isActive
                    ? "scale-125 bg-maroon shadow-[0_0_8px_rgba(185,32,37,0.5)]"
                    : "border border-maroon/40 bg-white hover:bg-cream"
                }`}
              />
            );
          })}
        </div>

        {/* Render notice below active card if provided (e.g. Booking lead notice) */}
        {renderNoticeBelow && activeItem && (
          <div className="mt-5 px-2">{renderNoticeBelow(activeItem)}</div>
        )}
      </div>

      {/* ── DESKTOP VIEW (>= sm): Standard 3-card side-by-side layout (100% Preserved) ── */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
        {tiers.map((item) => {
          const selected = item.tier.id === selectedId;
          return (
            <div
              key={item.tier.id}
              className={`rounded-3xl border p-3 transition-all duration-300 ${
                item.tier.id === "platinum"
                  ? "border-zinc-700/80 bg-zinc-950/10 shadow-lg ring-1 ring-zinc-700/50"
                  : item.tier.id === "gold" || item.tier.popular
                    ? "border-amber-400/80 bg-amber-500/10 shadow-brand ring-2 ring-amber-400/40"
                    : "border-slate-300 bg-white/70 shadow-card ring-1 ring-slate-200"
              }`}
            >
              {item.tooSoon ? (
                <>
                  <div className="select-none opacity-60">
                    <PackageScrollCard
                      tier={item.tier}
                      selected={false}
                      onSelect={() => onSelectTier(item.tier.id)}
                      ctaOnFold
                      cta={<span aria-hidden="true" />}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream shadow-card">
                      <span aria-hidden="true">🔒</span>
                      {t("Locked", "लॉक")}
                    </span>
                  </div>
                </>
              ) : (
                <PackageScrollCard
                  tier={item.tier}
                  selected={selected}
                  onSelect={() => onSelectTier(item.tier.id)}
                  ctaOnFold
                  cta={renderCta(item.tier, selected)}
                />
              )}

              {renderNoticeBelow && renderNoticeBelow(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
