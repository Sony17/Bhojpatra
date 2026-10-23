import { cn } from "./cn";

/**
 * Veg / non-veg dish mark, drawn the way India's food labels are: veg is a
 * dot in a square, non-veg a triangle in a square (FSSAI, 2022) — veg in the
 * familiar label green (the one sanctioned non-brand hue), non-veg in brand
 * red, on white in both themes.
 */
export default function DietMark({
  diet,
  label,
  className,
}: {
  diet: "veg" | "non-veg";
  /** Spoken label; omit when the text beside the mark already says it. */
  label?: string;
  className?: string;
}) {
  const nonVeg = diet === "non-veg";
  return (
    <svg
      viewBox="0 0 16 16"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "h-3.5 w-3.5 shrink-0",
        nonVeg ? "text-brand-red" : "text-diet-veg",
        className,
      )}
    >
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2.5"
        className="fill-brand-white"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {nonVeg ? (
        <path d="M8 4.2 11.6 11H4.4Z" fill="currentColor" />
      ) : (
        <circle cx="8" cy="8" r="3.3" fill="currentColor" />
      )}
    </svg>
  );
}
