"use client";

import { cn } from "./cn";

/**
 * Location / address chip row — Blinkit-style “Deliver to” control. Opens a
 * sheet or navigates; the visual is shared everywhere location is shown.
 */
export default function AddressSelector({
  label,
  value,
  onClick,
  className,
}: {
  label?: string;
  value: string;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-card border border-maroon/8 bg-white px-3.5 py-2.5 text-left shadow-soft transition duration-200",
        onClick && "active:scale-[0.99] hover:border-maroon/20",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-maroon"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        {label && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-maroon">
            {label}
          </span>
        )}
        <span className="block truncate text-sm font-bold text-ink">{value}</span>
      </span>
      {onClick && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-ink/40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  );
}
