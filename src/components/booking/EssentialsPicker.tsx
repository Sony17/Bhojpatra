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
 * The wizard preselects Essential Service (Package A); tapping the picked tile
 * again drops the service.
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
  const count = packages.length;

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label={t("Service package", "सर्विस पैकेज")}
        // Phones: a 2-up grid, so names like "Ultra Luxury Service" and their
        // "For …" line read in full. Wider screens: one row, like a tier
        // strip — four tiles fill the width and any more swipe in from the
        // right. Top padding leaves room for the ✓ badge.
        className={
          "grid grid-cols-2 gap-2 pb-0.5 pt-1.5 sm:flex sm:snap-x sm:gap-2.5 sm:overflow-x-auto sm:[scrollbar-width:none] " +
          (count <= 4
            ? "sm:[&>*]:flex-1"
            : "sm:[&>*]:basis-0 sm:[&>*]:grow")
        }
      >
        {packages.map((pkg) => (
          <Tile
            key={pkg.id}
            selected={pkg.id === selectedId}
            onSelect={() => onSelect(pkg.id === selectedId ? "" : pkg.id)}
            icon={pkg.icon}
            title={lang === "hi" ? pkg.nameHi : pkg.name}
            subtitle={lang === "hi" ? pkg.subtitleHi : pkg.subtitle}
          />
        ))}
      </div>

      {selected && (
        <PackageDetail
          key={selected.id}
          pkg={selected}
          guests={guests}
          lang={lang}
          t={t}
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
        "relative flex min-w-0 snap-start flex-col items-center rounded-xl border px-1 pb-1.5 pt-2 text-center transition sm:px-2 sm:pb-2.5 sm:pt-3 " +
        (selected
          ? "border-[1.5px] border-maroon bg-cream/20"
          : "border-cream-3/70 bg-white hover:bg-cream/15")
      }
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-maroon text-white ring-2 ring-white"
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
      )}
      <span
        aria-hidden="true"
        className="flex h-6 items-center justify-center text-[1.35rem] leading-none sm:h-7 sm:text-2xl"
      >
        {icon}
      </span>
      <span
        className={
          "mt-1 line-clamp-2 text-[12px] font-semibold leading-tight [overflow-wrap:anywhere] sm:text-sm " +
          (selected ? "text-maroon" : "text-ink")
        }
      >
        {title}
      </span>
      {subtitle && (
        <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-ink/70 sm:text-[11px]">
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
      free={total <= 0}
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
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-cream/50 px-2.5 py-0.5 text-[11.5px] text-ink transition hover:bg-cream"
        >
          {open
            ? t("Hide details", "विवरण छिपाएं")
            : t("What's included", "क्या शामिल है")}
          <svg
            viewBox="0 0 24 24"
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
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
          <div className="space-y-3 text-sm">
            {/* Included — the bulk of the list, two columns from tablet up. */}
            {pkg.includes.length > 0 && (
              <section>
                <DetailHeading>{t("Included", "शामिल")}</DetailHeading>
                <ul className="mt-1.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {pkg.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-ink">
                      <span
                        aria-hidden="true"
                        className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-maroon text-[8px] font-bold text-white"
                      >
                        ✓
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Not included — short, so it reads as one row of chips. */}
            {pkg.notIncluded.length > 0 && (
              <section>
                <DetailHeading>{t("Not included", "शामिल नहीं")}</DetailHeading>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {pkg.notIncluded.map((line) => (
                    <li
                      key={line}
                      className="inline-flex items-center gap-1 rounded-full border border-cream-3 bg-white px-2.5 py-0.5 text-xs text-ink/70"
                    >
                      <span aria-hidden="true" className="text-[10px] font-bold">
                        ✕
                      </span>
                      {line.replace(/^No\s+/i, "")}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tiers.length > 0 && (
              <section>
                <DetailHeading>{t("Price by guests", "मेहमानों के हिसाब से कीमत")}</DetailHeading>
                <table className="mt-1.5 w-full text-left text-sm sm:max-w-sm">
                  <tbody>
                    {tiers.map((tier) => {
                      const on = tier === activeTier;
                      return (
                        <tr
                          key={tier.minGuests}
                          className={on ? "bg-white font-semibold text-ink" : "text-ink/70"}
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
              </section>
            )}
          </div>
        )
      }
    />
  );
}

/** Small uppercase label over each block of the details panel. */
function DetailHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-maroon">
      {children}
    </h4>
  );
}

/** The picked option opened up: big icon, its name, its price for this order. */
function DetailCard({
  icon,
  badge,
  title,
  subtitle,
  price,
  priceUnit,
  priceNote,
  free,
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
  /** Nothing to pay — the note ("no extra charge") is the price. */
  free?: boolean;
  toggle?: ReactNode;
  details?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-cream-3 bg-cream/20 px-2.5 py-2 sm:px-3.5 sm:py-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream/80 text-2xl sm:h-12 sm:w-12 sm:text-[1.75rem]"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          {badge && (
            <span className="block text-[9px] font-bold uppercase leading-tight tracking-wider text-maroon">
              {badge}
            </span>
          )}
          <p className="text-[15px] font-semibold leading-tight text-ink sm:text-lg">
            {title}
          </p>
          {subtitle && (
            <p className="line-clamp-2 text-[11.5px] leading-snug text-ink/70 sm:text-[13px]">{subtitle}</p>
          )}
          {toggle}
        </div>
        <div className="flex w-[5.5rem] shrink-0 flex-col justify-center self-stretch border-l border-cream-3 pl-2.5 text-center sm:w-32">
          {free ? (
            <span className="text-[13px] font-semibold leading-tight text-maroon first-letter:uppercase sm:text-base">
              {priceNote}
            </span>
          ) : (
            <>
              <span className="whitespace-nowrap text-[15px] font-bold text-maroon sm:text-lg">
                {price}
                {priceUnit && (
                  <span className="ml-0.5 text-[11px] font-normal text-ink/70">{priceUnit}</span>
                )}
              </span>
              <span className="text-[10.5px] leading-tight text-ink/70">{priceNote}</span>
            </>
          )}
        </div>
      </div>
      {details && (
        <div className="mt-2 border-t border-cream-3 pt-2">{details}</div>
      )}
    </div>
  );
}
