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
        eyebrow={t("Single Stall", "सिंगल स्टॉल")}
        title={t("What stall do you want?", "कौन सा स्टॉल चाहिए?")}
        sub={
          cityLabel
            ? t(`Available in ${cityLabel}`, `${cityLabel} में उपलब्ध`)
            : undefined
        }
      />

      {available.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {available.map((s) => {
            const count = counts[s.id];
            const name = lang === "hi" ? s.nameHi : s.name;
            return (
              <a
                key={s.id}
                href={hrefFor(s.id)}
                className={
                  "group overflow-hidden rounded-2xl border bg-white transition hover:border-maroon " +
                  (s.id === selectedId ? "border-maroon" : "border-cream")
                }
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-ink group-hover:text-maroon">
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {count === 1
                      ? t("1 stall", "1 स्टॉल")
                      : t(`${count} stalls`, `${count} स्टॉल`)}
                  </p>
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

      <div className="pt-5 text-center">
        <a
          href={browseAllHref}
          className="text-xs font-semibold text-maroon underline underline-offset-4"
        >
          {t("See all stalls", "सभी स्टॉल देखें")}
        </a>
      </div>
    </div>
  );
}
