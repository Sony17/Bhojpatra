import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Interactive filter/selection pill (Swiggy-style category chips). Toggles
 * between idle (cream outline) and selected (solid red). Use for filters,
 * multi-select tags, quick-pick options.
 */
export default function Chip({
  selected = false,
  leftIcon,
  children,
  className,
  ...rest
}: {
  selected?: boolean;
  leftIcon?: ReactNode;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 active:scale-[.97]",
        selected
          ? "border-maroon bg-maroon text-cream shadow-brand"
          : "border-cream-3 bg-white text-ink hover:border-maroon hover:bg-cream-2",
        className,
      )}
      {...rest}
    >
      {leftIcon}
      {children}
    </button>
  );
}
