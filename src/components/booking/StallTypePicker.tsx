"use client";

import Image from "next/image";
import SectionHead from "@/components/booking/shared/SectionHead";
import { stallTypes } from "@/lib/stallTypes";
import { isUnoptimized } from "@/lib/homeContentData";
import type { StallTileImages } from "@/lib/stallTileImages";

/**
 * The Single Stall funnel's first gate: pick WHAT kind of stall you want
 * before you pick WHO runs it. Only types that have stalls in the chosen city
 * are shown — each tile links into the Brands catalog pre-filtered to that
 * type and city.
 */
export default function StallTypePicker({
  t,
  lang,
  cityLabel,
  counts,
  loading = false,
  images,
  selectedId = "",
  hrefFor,
}: {
  t: (en: string, hi: string) => string;
  lang: string;
  cityLabel: string;
  counts: Record<string, number>;
  /** The stall roster is still loading — show placeholder tiles, not the
   *  empty state. */
  loading?: boolean;
  /** Admin-set tile photos by type id. A type without one shows its icon. */
  images: StallTileImages;
  /** The type the guest was last browsing — outlined so backing out of a
   *  stall lands them where they left off. */
  selectedId?: string;
  hrefFor: (typeId: string) => string;
}) {
  const available = stallTypes.filter((s) => (counts[s.id] ?? 0) > 0);

  return (
    <div>
      <SectionHead
        compact
        eyebrow={t("One Bhojpatra Experience", "एक भोजपत्र अनुभव")}
        title={t("Curated Single Stall", "क्यूरेटेड सिंगल स्टॉल")}
        sub={t(
          "Don’t Just Order Food—Bring Lucknow’s Iconic Food Stalls to Your Home Parties & Get-Togethers!",
          "सिर्फ़ खाना ऑर्डर न करें — लखनऊ के मशहूर फ़ूड स्टॉल्स को अपनी घर की पार्टियों और मिलन-समारोहों में लाएँ!",
        )}
      />

      {/* Per-head guide by gathering size — display copy only; the bill is
          still the picked dishes' per-plate. */}
      <ul className="-mt-1 mb-3 flex flex-wrap gap-2 sm:-mt-3 sm:mb-6">
        {[
          [t("50–99 guests", "50–99 मेहमान"), "₹299"],
          [t("100+ guests", "100+ मेहमान"), "₹199"],
        ].map(([band, price]) => (
          <li
            key={band}
            className="flex items-baseline gap-1.5 rounded-full border border-cream bg-white px-3 py-1 text-[11px] text-ink sm:text-sm"
          >
            <span>{band}</span>
            <span className="font-bold text-maroon">{price}</span>
            <span className="text-ink/55">{t("per head", "प्रति व्यक्ति")}</span>
          </li>
        ))}
      </ul>

      {loading ? (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          role="status"
          aria-label={t("Loading stalls", "स्टॉल लोड हो रहे हैं")}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="grid h-[9.5rem] grid-cols-[minmax(0,1fr)] grid-rows-[7fr_3fr] overflow-hidden rounded-2xl border border-cream bg-white sm:flex sm:h-auto sm:flex-col"
              aria-hidden="true"
            >
              <div className="min-h-0 w-full animate-pulse bg-cream-2 sm:aspect-[16/10]" />
              <div className="flex flex-col justify-center gap-1.5 px-2.5 sm:px-3 sm:py-2.5">
                <span className="h-3 w-2/3 animate-pulse rounded bg-cream-2" />
                <span className="h-2.5 w-1/3 animate-pulse rounded bg-cream-2" />
              </div>
            </div>
          ))}
        </div>
      ) : available.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {available.map((s) => {
            const count = counts[s.id];
            const name = lang === "hi" ? s.nameHi : s.name;
            const selected = s.id === selectedId;
            const image = images[s.id];
            return (
              <a
                key={s.id}
                href={hrefFor(s.id)}
                aria-current={selected ? "true" : undefined}
                className={
                  // Phones: a fixed-height card — photo on top, the name (up to two
                  // lines) below it. The single minmax(0,1fr) column stops a long
                  // name from widening the card past its edge (Safari clips it and
                  // the chevron with it). Tablet / desktop keep the natural flow.
                  "group relative grid h-[9.5rem] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-white shadow-soft transition hover:border-maroon hover:shadow-card active:scale-[0.98] sm:flex sm:h-auto sm:flex-col " +
                  (selected ? "border-maroon ring-1 ring-maroon" : "border-cream")
                }
              >
                <div className="relative min-h-0 w-full overflow-hidden sm:aspect-[16/10]">
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                      unoptimized={isUnoptimized(image)}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      className="grid h-full w-full place-items-center bg-cream-2 text-4xl"
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                  )}
                  {selected && (
                    <span
                      className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-maroon text-white shadow-soft"
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
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-between gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-[13px] font-semibold leading-tight sm:text-[15px] text-ink group-hover:text-maroon">
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
