"use client";

import Image from "next/image";
import SectionHead from "@/components/booking/shared/SectionHead";
import { stallTypes } from "@/lib/stallTypes";

/**
 * The Single Stall funnel's first gate: pick WHAT kind of stall you want
 * before you pick WHO runs it. Only types that have stalls in the chosen city
 * are shown — each tile links into the Brands catalog pre-filtered to that
 * type and city. A city with none gets a single "see all stalls" way out.
 */
export default function StallTypePicker({
  t,
  lang,
  cityLabel,
  counts,
  selectedId = "",
  hrefFor,
  browseAllHref,
}: {
  t: (en: string, hi: string) => string;
  lang: string;
  cityLabel: string;
  counts: Record<string, number>;
  /** The type the guest was last browsing — outlined so backing out of a
   *  stall lands them where they left off. */
  selectedId?: string;
  hrefFor: (typeId: string) => string;
  browseAllHref: string;
}) {
  const available = stallTypes.filter((s) => (counts[s.id] ?? 0) > 0);

  return (
    <div>
      <SectionHead
        compact
        eyebrow={t("Single Stall", "सिंगल स्टॉल")}
        title={t("What stall do you want?", "कौन सा स्टॉल चाहिए?")}
        sub={
          cityLabel
            ? t(`Available in ${cityLabel}`, `${cityLabel} में उपलब्ध`)
            : undefined
        }
        action={
          <a
            href={browseAllHref}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-maroon transition hover:underline sm:text-sm"
          >
            {t("See all stalls", "सभी स्टॉल देखें")}
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </a>
        }
      />

      {available.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {available.map((s) => {
            const count = counts[s.id];
            const name = lang === "hi" ? s.nameHi : s.name;
            const selected = s.id === selectedId;
            return (
              <a
                key={s.id}
                href={hrefFor(s.id)}
                aria-current={selected ? "true" : undefined}
                className={
                  // Phones: a fixed-height card split 70% image / 30% text, so four cards
                  // fit on one screen. Tablet / desktop keep the natural flow.
                  "group relative grid h-[8.75rem] grid-rows-[7fr_3fr] overflow-hidden rounded-2xl border bg-white shadow-soft transition hover:border-maroon hover:shadow-card active:scale-[0.98] sm:flex sm:h-auto sm:flex-col " +
                  (selected ? "border-maroon ring-1 ring-maroon" : "border-cream")
                }
              >
                <div className="relative min-h-0 w-full overflow-hidden sm:aspect-[16/10]">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {selected && (
                    <span
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-maroon text-white shadow-soft"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-3 sm:py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight sm:line-clamp-2 sm:whitespace-normal sm:break-words sm:text-[15px] text-ink group-hover:text-maroon">
                      {name}
                    </p>
                    <p className="text-[11px] leading-tight text-ink-soft sm:mt-0.5 sm:text-xs">
                      {count === 1
                        ? t("1 stall", "1 स्टॉल")
                        : t(`${count} stalls`, `${count} स्टॉल`)}
                    </p>
                  </div>
                  <span
                    className={
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full transition " +
                      (selected
                        ? "bg-maroon text-white"
                        : "bg-cream-2 text-maroon group-hover:bg-maroon group-hover:text-white")
                    }
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-cream bg-white p-6 text-center text-sm text-ink-soft">
          {cityLabel
            ? t(`No stalls in ${cityLabel} yet.`, `${cityLabel} में अभी कोई स्टॉल नहीं।`)
            : t("No stalls yet.", "अभी कोई स्टॉल नहीं।")}
        </p>
      )}
    </div>
  );
}
