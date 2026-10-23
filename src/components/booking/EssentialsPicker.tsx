"use client";

import { useState, type ReactNode } from "react";
import type { ServicePackage } from "@/lib/data";
import { money } from "@/lib/money";
import {
  serviceRate,
  serviceTierFor,
  serviceTotal,
  tierRangeLabel,
} from "@/lib/servicePricing";

/**
 * Single Stall "Essentials" step — the optional service package as a row of
 * compact selectable tiles, with the picked one opened up below as a detail
 * card (its price for this order, and what's included on demand).
 *
 * Every option prices itself for THIS order: the admin's guest-band rate for
 * the current head-count leads (per-plate first), the total is the sub-line.
 * The first tile is "No service needed", so skipping is a choice like any other.
 */
export default function EssentialsPicker({
  packages,
  selectedId,
  onSelect,
  guests,
  lang,
  t,
}: {
  packages: ServicePackage[];
  /** "" = no service. */
  selectedId: string;
  onSelect: (id: string) => void;
  guests: number;
  lang: "en" | "hi";
  t: (en: string, hi: string) => string;
}) {
  const selected = packages.find((p) => p.id === selectedId);
  const noneTitle = t("No service needed", "कोई सर्विस नहीं चाहिए");
  const noneSub = t(
    "Just the stall — your venue covers serving",
    "सिर्फ़ स्टॉल — सर्विस वेन्यू देगा",
  );
  const count = packages.length + 1;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div
        role="radiogroup"
        aria-label={t("Service package", "सर्विस पैकेज")}
        // One row, like a tier strip: on phones it swipes once the options
        // outgrow four tiles; from sm up every tile shares the width.
        className={
          "-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 " +
          (count <= 4 ? "[&>*]:flex-1" : "[&>*]:w-[6.75rem] [&>*]:shrink-0 sm:[&>*]:w-auto sm:[&>*]:flex-1")
        }
      >
        <Tile
          selected={selectedId === ""}
          onSelect={() => onSelect("")}
          icon={<NoneIcon />}
          title={noneTitle}
          subtitle={noneSub}
        />
        {packages.map((pkg) => (
          <Tile
            key={pkg.id}
            selected={pkg.id === selectedId}
            onSelect={() => onSelect(pkg.id)}
            icon={pkg.icon}
            title={lang === "hi" ? pkg.nameHi : pkg.name}
            subtitle={lang === "hi" ? pkg.subtitleHi : pkg.subtitle}
          />
        ))}
      </div>

      {selected ? (
        <PackageDetail
          key={selected.id}
          pkg={selected}
          guests={guests}
          lang={lang}
          t={t}
        />
      ) : (
        <DetailCard
          icon={<NoneIcon />}
          title={noneTitle}
          subtitle={noneSub}
          price={money(0)}
          priceNote={t("no extra charge", "कोई अतिरिक्त शुल्क नहीं")}
        />
      )}
    </div>
  );
}

/** One selectable tile in the tier row. */
function Tile({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={
        "relative flex min-w-0 snap-start flex-col items-center rounded-xl border px-1.5 pb-2.5 pt-3 text-center transition sm:rounded-2xl sm:px-3 sm:pb-4 sm:pt-5 " +
        (selected
          ? "border-maroon bg-cream/30 shadow-soft"
          : "border-cream-3 bg-white hover:bg-cream/15")
      }
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-white sm:right-2 sm:top-2"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
      )}
      <span
        aria-hidden="true"
        className="flex h-8 items-center justify-center text-2xl leading-none sm:h-10 sm:text-3xl"
      >
        {icon}
      </span>
      <span
        className={
          "mt-1.5 line-clamp-2 text-[12px] font-semibold leading-tight [overflow-wrap:anywhere] sm:mt-2 sm:text-sm " +
          (selected ? "text-maroon" : "text-ink")
        }
      >
        {title}
      </span>
      {subtitle && (
        <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-soft sm:text-xs">
          {subtitle}
        </span>
      )}
    </button>
  );
}

function PackageDetail({
  pkg,
  guests,
  lang,
  t,
}: {
  pkg: ServicePackage;
  guests: number;
  lang: "en" | "hi";
  t: (en: string, hi: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const rate = serviceRate(pkg, guests);
  const total = serviceTotal(pkg, guests);
  const activeTier = serviceTierFor(pkg, guests);
  const tiers = pkg.guestTiers ?? [];

  return (
    <DetailCard
      icon={pkg.icon}
      badge={pkg.badge}
      title={lang === "hi" ? pkg.nameHi : pkg.name}
      subtitle={lang === "hi" ? pkg.subtitleHi : pkg.subtitle}
      price={money(rate)}
      priceUnit={pkg.perPlate ? t("/ guest", "/ मेहमान") : undefined}
      priceNote={
        total > 0
          ? pkg.perPlate
            ? t(`${money(total)} for ${guests}`, `${guests} के लिए ${money(total)}`)
            : t("flat fee", "एकमुश्त शुल्क")
          : t("no extra charge", "कोई अतिरिक्त शुल्क नहीं")
      }
      toggle={
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cream/60 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-cream"
        >
          {open
            ? t("Hide details", "विवरण छिपाएं")
            : t("What's included", "क्या शामिल है")}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
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
      }
      details={
        open && (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <ul className="space-y-1.5">
              {pkg.includes.map((line) => (
                <li key={line} className="flex items-start gap-2 text-ink">
                  <span aria-hidden="true" className="mt-0.5 text-xs font-bold text-maroon">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
              {pkg.notIncluded.map((line) => (
                <li key={line} className="flex items-start gap-2 text-ink-soft">
                  <span aria-hidden="true" className="mt-0.5 text-xs font-bold">
                    ✕
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            {tiers.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-maroon">
                  {t("Price by guests", "मेहमानों के हिसाब से कीमत")}
                </p>
                <table className="mt-2 w-full text-left text-sm">
                  <tbody>
                    {tiers.map((tier) => {
                      const on = tier === activeTier;
                      return (
                        <tr
                          key={tier.minGuests}
                          className={on ? "bg-white font-semibold text-ink" : "text-ink-soft"}
                        >
                          <td className="rounded-l-md px-2 py-1">
                            {tierRangeLabel(tier)} {t("guests", "मेहमान")}
                          </td>
                          <td className="rounded-r-md px-2 py-1 text-right">
                            {money(tier.price)}
                            {pkg.perPlate ? t(" / guest", " / मेहमान") : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
    />
  );
}

/** The picked option opened up: big icon, display name, its price for this order. */
function DetailCard({
  icon,
  badge,
  title,
  subtitle,
  price,
  priceUnit,
  priceNote,
  toggle,
  details,
}: {
  icon: ReactNode;
  badge?: string;
  title: string;
  subtitle: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  toggle?: ReactNode;
  details?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cream-3 bg-cream/25 p-3.5 sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-3xl sm:h-20 sm:w-20 sm:text-4xl"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          {badge && (
            <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-maroon">
              {badge}
            </span>
          )}
          <p className="font-display text-lg leading-tight text-maroon sm:text-2xl">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p>
          )}
          {toggle}
        </div>
        <div className="shrink-0 self-stretch border-l border-cream-3 pl-3 text-right sm:pl-5">
          <div className="flex h-full flex-col justify-center">
            <span className="block whitespace-nowrap text-base font-bold text-maroon sm:text-xl">
              {price}
              {priceUnit && (
                <span className="ml-1 text-xs font-normal text-ink-soft">{priceUnit}</span>
              )}
            </span>
            <span className="block whitespace-nowrap text-xs text-ink-soft">{priceNote}</span>
          </div>
        </div>
      </div>
      {details && (
        <div className="mt-3 border-t border-cream-3 pt-3">{details}</div>
      )}
    </div>
  );
}

/** "No service" mark — a plain prohibition sign in ink. */
function NoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1em] w-[1em] text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}
