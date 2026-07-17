"use client";

import { useState } from "react";
import { cn } from "./cn";

/**
 * +/- quantity control — large touch targets, brand-safe. Used for guests,
 * plates, Baina boxes, live counters.
 *
 * Pass `editable` to swap the static readout for a number input so the value
 * can be typed directly or changed with the scroll wheel — the +/- buttons
 * still work and every entry is clamped to [min, max].
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
  editable = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  editable?: boolean;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const btn =
    size === "sm"
      ? "h-9 w-9 text-base"
      : "h-11 w-11 text-lg";

  // Local draft lets the field be emptied mid-edit; we clamp on commit.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) {
      onChange(min);
    } else {
      onChange(Math.min(max, Math.max(min, Math.round(n))));
    }
    setDraft(null);
  };

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
      {editable ? (
        <input
          type="number"
          inputMode="numeric"
          value={draft ?? String(value)}
          min={min}
          max={max}
          step={step}
          aria-label={label ?? "Quantity"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "w-16 rounded-control border border-cream bg-white text-center font-bold tabular-nums text-ink outline-none transition focus:border-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            size === "sm" ? "h-9 text-sm" : "h-11 text-base",
          )}
        />
      ) : (
        <span
          aria-live="polite"
          className={cn(
            "min-w-10 text-center font-bold tabular-nums text-ink",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          {value}
        </span>
      )}
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
