"use client";

import type { ReactNode } from "react";

/* ─── Step heading ────────────────────────────────────────────────────────
 * The display heading both booking wizards open each step with — a hairline +
 * eyebrow above a font-display title and an optional sub-line. Shared so a step
 * reads identically at /book (tiered feast) and /book/stall (Single Stall).
 */
export default function SectionHead({
  title,
  sub,
  eyebrow = "Curated for you",
  nowrap = false,
  compact = false,
  phoneMinimal = false,
  action,
}: {
  /** Phones: title only — the eyebrow and sub-line return from tablet up. */
  phoneMinimal?: boolean;
  /** Tighter phone spacing + a smaller title (Single Stall's picker). */
  compact?: boolean;
  /** Optional link/button aligned to the right of the sub-line (e.g. "See all"). */
  action?: ReactNode;
  title: string;
  sub?: string;
  /** Small caps line above the title. Defaults to the tiered wizard's wording. */
  eyebrow?: string;
  /** Keep the title on a single line on web (sm+) — used for short headings. */
  nowrap?: boolean;
}) {
  return (
    <div className={compact ? "mb-2.5 sm:mb-7" : "mb-5 sm:mb-7"}>
      <div
        className={
          (compact ? "mb-1 sm:mb-2" : "mb-2") +
          (phoneMinimal ? " hidden sm:flex" : " flex") +
          " items-center gap-2"
        }
      >
        <span className="h-px w-7 bg-maroon" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-maroon">
          {eyebrow}
        </span>
      </div>
      <h2
        className={`font-display ${phoneMinimal ? "text-xl" : compact ? "text-2xl" : "text-3xl"} leading-tight text-ink sm:text-4xl${
          nowrap ? " sm:whitespace-nowrap" : ""
        }`}
      >
        {title}
      </h2>
      {(sub || action) && (
        <div
          className={
            (phoneMinimal && !action ? "hidden sm:flex " : "flex ") +
            "items-baseline justify-between gap-3 " +
            (compact ? "mt-0.5 sm:mt-2" : "mt-2")
          }
        >
          {sub ? (
            <p className="min-w-0 max-w-2xl text-xs leading-relaxed text-ink/55 break-words sm:text-base">
              {sub}
            </p>
          ) : (
            <span />
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}
