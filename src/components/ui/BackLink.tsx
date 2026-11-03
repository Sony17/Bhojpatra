"use client";

import { cn } from "./cn";

/**
 * The one "back" control used across the booking flow and detail screens.
 *
 * - Same chevron glyph as AppBar (`BackChevron`), same 20px size.
 * - Same 44px tap target, focus ring and hover = maroon.
 * - Renders an anchor when `href` is given, otherwise a button (`onClick`).
 * - `iconOnly` is the compact round variant (AppBar, sticky mobile bar,
 *   header cards) — the label then becomes the accessible name.
 *
 * Pass `label` already translated: `label={t("Back to home", "होम पर वापस")}`.
 */
export function BackChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}

export default function BackLink({
  label,
  href,
  onClick,
  iconOnly = false,
  className,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  iconOnly?: boolean;
  className?: string;
}) {
  const classes = cn(
    "focus-ring tap inline-flex shrink-0 items-center text-ink transition duration-150 active:scale-95",
    iconOnly
      ? "h-11 w-11 justify-center rounded-full hover:bg-cream/60 hover:text-maroon"
      : "gap-1 rounded-full pr-3 text-sm font-semibold hover:text-maroon",
    className,
  );

  const content = (
    <>
      <BackChevron />
      {!iconOnly && <span>{label}</span>}
    </>
  );

  if (href !== undefined) {
    return (
      <a
        href={href}
        aria-label={iconOnly ? label : undefined}
        className={classes}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
