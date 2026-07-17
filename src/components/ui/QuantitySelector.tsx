"use client";

import { cn } from "./cn";

/**
 * +/- quantity control — large touch targets, brand-safe. Used for guests,
 * plates, Baina boxes, live counters.
 */
export default function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  className,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const btn =
    size === "sm"
      ? "h-9 w-9 text-base"
      : "h-11 w-11 text-lg";

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label={label ?? "Quantity"}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease"
        className={cn(
          "focus-ring flex items-center justify-center rounded-full border border-maroon/15 bg-white font-bold text-maroon transition duration-150 active:scale-95 disabled:opacity-35",
          btn,
        )}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-10 text-center font-bold tabular-nums text-ink",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase"
        className={cn(
          "focus-ring flex items-center justify-center rounded-full bg-maroon font-bold text-cream shadow-brand transition duration-150 active:scale-95 disabled:opacity-35",
          btn,
        )}
      >
        +
      </button>
    </div>
  );
}
