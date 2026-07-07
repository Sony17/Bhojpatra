"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";
import { vendorListings } from "@/lib/data";
import { useCompare, COMPARE_MAX } from "@/lib/compare";
import { setCompareTrayState } from "@/lib/compareTray";

/**
 * Sticky bottom tray listing the caterers a guest has ticked to compare, with a
 * "Compare" CTA into the `/compare` table. Rendered on the catalogue and detail
 * pages; hidden until at least one caterer is picked. Sits below the floating
 * chat (`z-[60]`) so it never covers the launcher.
 */
export default function CompareTray() {
  const { t } = useLang();
  const { ids, remove, clear } = useCompare();
  const ref = useRef<HTMLDivElement>(null);

  // Resolve picks to listings, preserving selection order.
  const picked = ids
    .map((id) => vendorListings.find((v) => v.id === id))
    .filter((v): v is (typeof vendorListings)[number] => Boolean(v));

  const shown = picked.length > 0;

  // Publish the tray's presence + measured height so the floating chat launcher
  // lifts clear of it (see lib/compareTray). Re-measure when the picks change —
  // the chip row can wrap to a second line — and clear the signal on unmount.
  useEffect(() => {
    if (shown && ref.current) {
      setCompareTrayState(true, ref.current.offsetHeight);
    } else {
      setCompareTrayState(false);
    }
  }, [shown, picked.length]);
  useEffect(() => () => setCompareTrayState(false), []);

  if (!shown) return null;

  const canCompare = picked.length >= 2;

  return (
    // Lifted above the mobile bottom tab bar (which is `lg:hidden`); on desktop
    // there's no tab bar, so it drops back to the very bottom edge.
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-3 pb-2 sm:px-5 lg:bottom-0 lg:pb-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-cream-3 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:flex-row sm:items-center sm:p-4">
        {/* Label + actions share one justified row on mobile; on desktop
            `sm:contents` flattens this wrapper so they split to the ends. */}
        <div className="flex items-center justify-between gap-3 sm:contents">
          <p className="shrink-0 text-sm font-semibold text-ink">
            {t("Compare", "तुलना करें")}{" "}
            <span className="text-ink-soft">
              ({picked.length}/{COMPARE_MAX})
            </span>
          </p>

          <div className="flex shrink-0 items-center gap-2 sm:order-last">
            <button
              type="button"
              onClick={clear}
              className="rounded-full px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:text-maroon"
            >
              {t("Clear", "साफ़ करें")}
            </button>
            {canCompare ? (
              <Link
                href="/compare"
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
              >
                {t("Compare", "तुलना करें")} →
              </Link>
            ) : (
              <span className="rounded-full bg-cream-2 px-4 py-2.5 text-xs font-medium text-ink-soft">
                {t("Add one more", "एक और जोड़ें")}
              </span>
            )}
          </div>
        </div>

        {/* On mobile the chips get their own full-width row and scroll sideways,
            so they never crowd the Clear / Compare buttons; on desktop they
            fill the space between label and actions. */}
        <ul className="flex min-w-0 items-center gap-2 overflow-x-auto sm:flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {picked.map((v) => (
            <li
              key={v.id}
              className="flex shrink-0 items-center gap-2 rounded-full border border-cream-3 bg-cream-2/40 py-1 pl-1 pr-2.5"
            >
              <span className="relative h-7 w-7 overflow-hidden rounded-full bg-cream-2">
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
              <span className="max-w-[8rem] truncate text-xs font-medium text-ink">
                {v.name}
              </span>
              <button
                type="button"
                onClick={() => remove(v.id)}
                aria-label={t(`Remove ${v.name}`, `${v.name} हटाएं`)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-3 hover:text-maroon"
              >
                <span aria-hidden="true" className="text-sm leading-none">×</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
