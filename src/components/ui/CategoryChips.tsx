"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import Chip from "./Chip";

/**
 * Horizontally scrolling category / filter chip row (Swiggy home rails).
 */
export default function CategoryChips({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="listbox"
      aria-label={label ?? "Categories"}
      className={cn(
        "no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CategoryChip({
  selected,
  children,
  onClick,
  count,
  leftIcon,
  className,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick?: () => void;
  count?: number;
  leftIcon?: ReactNode;
  className?: string;
}) {
  return (
    <Chip
      selected={selected}
      onClick={onClick}
      leftIcon={leftIcon}
      className={cn("shrink-0 whitespace-nowrap", className)}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            selected ? "bg-cream text-maroon" : "bg-maroon/10 text-maroon",
          )}
        >
          {count}
        </span>
      )}
    </Chip>
  );
}
