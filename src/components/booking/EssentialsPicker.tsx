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
 * Single Stall "Essentials" step — the optional service package as one compact
 * single-select list instead of the feast flow's four tall comparison cards
 * (which on a phone became a chip row over one card, with the "no service"
 * choice floating apart from them).
 *
 * Every row prices itself for THIS order: the admin's guest-band rate for the
 * current head-count leads (per-plate first), the total is the sub-line. The
 * first row is "No service needed", so skipping is a choice like any other.
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
  return (
    <div role="radiogroup" aria-label={t("Service package", "सर्विस पैकेज")} className="space-y-3">
      <OptionRow
        selected={selectedId === ""}
        onSelect={() => onSelect("")}
        icon="🙅"
        title={t("No service needed", "कोई सर्विस नहीं चाहिए")}
        subtitle={t("Just the stall — your venue covers serving", "सिर्फ़ स्टॉल — सर्विस वेन्यू देगा")}
        price={money(0)}
        priceNote={t("no extra charge", "कोई अतिरिक्त शुल्क नहीं")}
      />
      {packages.map((pkg) => (
        <PackageRow
          key={pkg.id}
          pkg={pkg}
          selected={pkg.id === selectedId}
          onSelect={() => onSelect(pkg.id)}
          guests={guests}
          lang={lang}
          t={t}
        />
      ))}
    </div>
  );
}

function PackageRow({
  pkg,
  selected,
  onSelect,
  guests,
  lang,
  t,
}: {
  pkg: ServicePackage;
  selected: boolean;
  onSelect: () => void;
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
    <OptionRow
      selected={selected}
      onSelect={onSelect}
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
      details={
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-maroon underline-offset-2 hover:underline"
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
          {open && (
            <div className="mt-3 grid gap-4 border-t border-cream-3 pt-3 text-sm sm:grid-cols-2">
              <div>
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
              </div>
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
                            className={on ? "bg-cream font-semibold text-ink" : "text-ink-soft"}
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
          )}
        </>
      }
    />
  );
}

/** One selectable row: radio dot, icon, name, and its price for this order. */
function OptionRow({
  selected,
  onSelect,
  icon,
  badge,
  title,
  subtitle,
  price,
  priceUnit,
  priceNote,
  details,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: string;
  badge?: string;
  title: string;
  subtitle: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  details?: ReactNode;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-4 transition " +
        (selected
          ? "border-maroon bg-cream/35 shadow-soft"
          : "border-cream-3 bg-white hover:bg-cream-2")
      }
    >
      {/* The row's main line is the radio; the details toggle sits outside it
          so opening "What's included" never changes the pick. */}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className={
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 " +
            (selected ? "border-maroon" : "border-cream-3")
          }
        >
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-maroon" />}
        </span>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-xl"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          {badge && (
            <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-maroon">
              {badge}
            </span>
          )}
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-xs text-ink-soft">{subtitle}</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block whitespace-nowrap text-base font-bold text-maroon">
            {price}
            {priceUnit && (
              <span className="ml-1 text-xs font-normal text-ink-soft">{priceUnit}</span>
            )}
          </span>
          <span className="block whitespace-nowrap text-xs text-ink-soft">{priceNote}</span>
        </span>
      </button>
      {details && <div className="sm:pl-[5.25rem]">{details}</div>}
    </div>
  );
}
