"use client";

import { cn } from "./cn";

/**
 * Sticky / standalone search field — Swiggy-style rounded pill with leading
 * icon, clear button, and 44px+ touch target. Use inside `.app-sticky-chrome`
 * or as a standalone control.
 */
export default function AppSearchBar({
  value,
  onChange,
  onClear,
  placeholder,
  "aria-label": ariaLabel,
  id,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  "aria-label": string;
  id?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 transition-colors duration-200 group-focus-within:text-maroon"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          "tap w-full rounded-full border border-maroon/10 bg-cream/35 py-2.5 pl-11 pr-10 text-[14px] text-ink outline-none transition duration-200 placeholder:text-ink/40 focus:border-maroon/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(185,32,37,0.12)] sm:py-3 sm:text-[15px] [&::-webkit-search-cancel-button]:appearance-none",
          inputClassName,
        )}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(""))}
          aria-label="Clear search"
          className="focus-ring absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink/45 transition-colors duration-200 hover:bg-cream hover:text-maroon"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      )}
    </div>
  );
}
