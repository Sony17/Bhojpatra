"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useCompare, COMPARE_MAX } from "@/lib/compare";
import {
  setCompareTrayState,
  useCompareTableOpenRequest,
} from "@/lib/compareTray";
import { useAllVendors } from "@/lib/useAllVendors";
import { Button } from "@/components/ui";
import CompareView from "@/components/vendors/CompareView";

/**
 * Sticky bottom tray listing the caterers a guest has ticked to compare, with a
 * "Compare" CTA that opens the side-by-side comparison table. Rendered on the
 * catalogue and detail pages; hidden until at least one caterer is picked.
 * Sits below the floating chat (`z-[60]`) so it never covers the launcher.
 */
export default function CompareTray() {
  const { t } = useLang();
  const { ids, remove, clear } = useCompare();
  const allVendors = useAllVendors();
  const ref = useRef<HTMLDivElement>(null);
  const [tableOpen, setTableOpen] = useState(false);

  // Resolve picks to listings, preserving selection order.
  const picked = ids
    .map((id) => allVendors.find((v) => v.id === id))
    .filter((v): v is (typeof allVendors)[number] => Boolean(v));

  const shown = picked.length > 0;
  const canCompare = picked.length >= 2;

  const openTable = useCallback(() => {
    if (picked.length >= 2) setTableOpen(true);
  }, [picked.length]);
  useCompareTableOpenRequest(openTable);

  // Close the table when the selection is cleared or drops below 2.
  useEffect(() => {
    if (picked.length < 2) setTableOpen(false);
  }, [picked.length]);

  // Publish the tray's presence + measured height so the floating chat launcher
  // lifts clear of it (see lib/compareTray). Re-measure when the picks change —
  // the chip row can wrap to a second line — and clear the signal on unmount.
  // Hide the tray signal while the full compare table is open (it covers the dock).
  useEffect(() => {
    if (shown && !tableOpen && ref.current) {
      setCompareTrayState(true, ref.current.offsetHeight);
    } else {
      setCompareTrayState(false);
    }
  }, [shown, picked.length, tableOpen]);
  useEffect(() => () => setCompareTrayState(false), []);

  // Lock body scroll while the comparison table is up; Escape closes it.
  useEffect(() => {
    if (!tableOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTableOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [tableOpen]);

  if (!shown && !tableOpen) return null;

  return (
    <>
      {shown && !tableOpen && (
        // Lifted above the mobile bottom tab bar (which is `lg:hidden`); on desktop
        // there's no tab bar, so it drops back to the very bottom edge.
        <div
          ref={ref}
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-3 pb-2 sm:px-5 lg:bottom-0 lg:pb-5"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-hero border border-maroon/8 bg-white/96 p-3 shadow-pop-up backdrop-blur-xl sm:flex-row sm:items-center sm:p-4">
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
                <Button variant="ghost" size="sm" onClick={clear}>
                  {t("Clear", "साफ़ करें")}
                </Button>
                {canCompare ? (
                  <Button variant="primary" size="sm" onClick={openTable}>
                    {t("Compare", "तुलना करें")} →
                  </Button>
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
                    <span aria-hidden="true" className="text-sm leading-none">
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tableOpen && (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("Compare Caterers", "कैटरर की तुलना")}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-cream-3 px-4 py-3 sm:px-5">
            <p className="font-display text-lg text-ink sm:text-xl">
              {t("Compare Caterers", "कैटरर की तुलना")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTableOpen(false)}
              aria-label={t("Close comparison", "तुलना बंद करें")}
            >
              {t("Close", "बंद करें")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CompareView embedded onClose={() => setTableOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
