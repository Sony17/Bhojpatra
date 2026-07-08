import { cn } from "./cn";

export type SegmentOption<T extends string = string> = {
  value: T;
  label: string;
};

/**
 * Segmented toggle (2–4 mutually exclusive options) — e.g. Login/Signup,
 * Monthly/Yearly, list/grid. One pill track, active segment fills red.
 */
export default function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-cream-2 p-1 text-sm font-semibold",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring rounded-full px-4 py-1.5 transition duration-200",
              active
                ? "bg-maroon text-cream shadow-sm"
                : "text-maroon hover:bg-cream-3",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
