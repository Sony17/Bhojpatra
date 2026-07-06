"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { vendorListings } from "@/lib/data";
import { useCompare, COMPARE_MAX } from "@/lib/compare";

/**
 * Sticky bottom tray listing the caterers a guest has ticked to compare, with a
 * "Compare" CTA into the `/compare` table. Rendered on the catalogue and detail
 * pages; hidden until at least one caterer is picked. Sits below the floating
 * chat (`z-[60]`) so it never covers the launcher.
 */
export default function CompareTray() {
  const { t } = useLang();
  const { ids, remove, clear } = useCompare();

  if (ids.length === 0) return null;

  // Resolve picks to listings, preserving selection order.
  const picked = ids
    .map((id) => vendorListings.find((v) => v.id === id))
    .filter((v): v is (typeof vendorListings)[number] => Boolean(v));

  const canCompare = picked.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-cream-3 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:p-4">
        <p className="shrink-0 text-sm font-semibold text-ink">
          {t("Compare", "तुलना करें")}{" "}
          <span className="text-ink-soft">
            ({picked.length}/{COMPARE_MAX})
          </span>
        </p>

        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {picked.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 rounded-full border border-cream-3 bg-cream-2/40 py-1 pl-1 pr-2.5"
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

        <div className="flex shrink-0 items-center gap-2">
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
    </div>
  );
}
