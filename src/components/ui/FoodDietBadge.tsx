import React from "react";
import { cn } from "./cn";

export type FoodDiet = "Veg" | "Non-Veg" | "Veg & Non-Veg";

const GREEN = "#008000";
const RED = "#B92025";

interface FoodDietBadgeProps {
  diet: FoodDiet;
  lang?: string;
  className?: string;
}

/**
 * FSSAI-compliant statutory food classification indicator.
 * Displays:
 *  - Green dot for "Veg"
 *  - Red dot for "Non-Veg"
 *  - Both Green and Red dots side-by-side for "Veg & Non-Veg"
 *
 * Designed to sit cleanly on card media planes with high contrast,
 * backdrop blur, and full screen-reader accessibility.
 */
export function FoodDietBadge({ diet, lang = "en", className }: FoodDietBadgeProps) {
  const isHi = lang === "hi";

  const label =
    diet === "Veg"
      ? isHi
        ? "शाकाहारी"
        : "Vegetarian"
      : diet === "Non-Veg"
        ? isHi
          ? "मांसाहारी"
          : "Non-Vegetarian"
        : isHi
          ? "शाकाहारी और मांसाहारी"
          : "Vegetarian & Non-Vegetarian";

  const showVeg = diet === "Veg" || diet === "Veg & Non-Veg";
  const showNonVeg = diet === "Non-Veg" || diet === "Veg & Non-Veg";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm border border-black/5 select-none",
        className,
      )}
    >
      <span className="sr-only">{label}</span>

      {showVeg && (
        <span
          aria-hidden="true"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white"
          style={{ borderColor: GREEN }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: GREEN }}
          />
        </span>
      )}

      {showNonVeg && (
        <span
          aria-hidden="true"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white"
          style={{ borderColor: RED }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: RED }}
          />
        </span>
      )}
    </span>
  );
}

export default FoodDietBadge;
