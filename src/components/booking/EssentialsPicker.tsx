"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { servicePhoto, type ServicePackage } from "@/lib/data";
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
        // Four tiles to a row on every screen, like a tier strip. Four or
        // fewer sit in a plain grid; any more swipe in from the right, still
        // four to a view. Top padding leaves room for the ✓ badge.
        className={
          count <= 4
            ? "grid grid-cols-4 gap-1.5 pb-0.5 pt-1.5 sm:gap-2.5"
            : "flex snap-x gap-1.5 overflow-x-auto pb-0.5 pr-1 pt-1.5 [scrollbar-width:none] sm:gap-2.5 [&>*]:shrink-0 [&>*]:basis-[calc((100%_-_3*0.375rem)/4)] sm:[&>*]:basis-[calc((100%_-_3*0.625rem)/4)]"
        }
      >
        {packages.map((pkg) => (
          <Tile
            key={pkg.id}
            selected={pkg.id === selectedId}
            onSelect={() => onSelect(pkg.id === selectedId ? "" : pkg.id)}
            icon={pkg.icon}
            photo={servicePhoto(pkg)}
            title={lang === "hi" ? pkg.nameHi : pkg.name}
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
  photo,
  title,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  photo?: string;
  title: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={
        "relative flex min-w-0 snap-start flex-col items-center justify-start rounded-lg border p-1 text-center transition sm:p-1.5 " +
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
      {photo ? (
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-cream-2">
          <Image src={photo} alt="" fill sizes="(min-width: 640px) 160px, 25vw" className="object-cover" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-5 items-center justify-center text-base leading-none sm:h-6 sm:text-xl"
        >
          {icon}
        </span>
      )}
      <span
        className={
          "mt-0.5 break-words text-[10px] font-semibold leading-tight hyphens-auto min-[390px]:text-[11px] sm:text-[13px] " +
          (selected ? "text-maroon" : "text-ink")
        }
      >
        {title}
      </span>
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
      photo={servicePhoto(pkg)}
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
            {/* Included — the bulk of the list, in two columns at every width. */}
            {pkg.includes.length > 0 && (
              <section>
                <DetailHeading>{t("Included", "शामिल")}</DetailHeading>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:gap-x-4 sm:text-sm">
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
  photo,
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
  photo?: string;
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
        {photo ? (
          <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-cream-2 sm:h-12 sm:w-12">
            <Image src={photo} alt="" fill sizes="48px" className="object-cover" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream/80 text-2xl sm:h-12 sm:w-12 sm:text-[1.75rem]"
          >
            {icon}
          </span>
        )}
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
