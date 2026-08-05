"use client";

import { cn } from "./cn";

/**
 * Minimal +/- quantity stepper — a single rounded pill with generous touch
 * targets and ghost controls. Brand-safe. Used for guests, plates, Baina
 * boxes, live counters.
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
  const btn = size === "sm" ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl";

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-full border border-[#E5C185] bg-white shadow-xs",
        className,
      )}
      role="group"
      aria-label={label ?? "Quantity"}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease"
        className={cn(
          "focus-ring flex items-center justify-center font-bold leading-none text-maroon transition duration-150 hover:bg-cream/40 active:scale-95 disabled:opacity-30",
          btn,
        )}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={cn(
          "flex min-w-10 items-center justify-center border-x border-[#E5C185]/60 px-2.5 text-center font-bold tabular-nums text-ink",
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
          "focus-ring flex items-center justify-center font-bold leading-none text-maroon transition duration-150 hover:bg-cream/30 active:scale-95 disabled:opacity-30",
          btn,
        )}
      >
        +
      </button>
    </div>
  );
}
