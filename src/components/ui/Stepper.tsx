import { cn } from "./cn";

/**
 * Horizontal step rail for multi-step flows (the booking wizard). Shows where
 * the user is ("Step 2 / 5"), which steps are done (check), and the remaining
 * ones. Answers the "what happens next?" UX question at a glance.
 *
 * `current` is a 0-based index into `steps`.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-center gap-2", className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="relative flex min-w-0 flex-1 items-center gap-2">
            {/* The number doubles as a tap/hover target: on mobile the step
                label is hidden to save width, so pressing (or hovering) the
                number peeks its name via the tooltip below. On sm+ the label
                sits inline, so the tooltip is hidden there. */}
            <button
              type="button"
              aria-label={`Step ${i + 1}: ${label}${
                active ? " — current step" : done ? " — done" : ""
              }`}
              className={cn(
                "peer flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-maroon/40",
                active
                  ? "bg-maroon text-cream ring-4 ring-maroon/15"
                  : done
                    ? "bg-maroon text-cream"
                    : "bg-cream-2 text-ink-soft",
              )}
            >
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-0 z-30 whitespace-nowrap rounded-lg bg-maroon px-2 py-1 text-[11px] font-semibold text-cream opacity-0 shadow-pop transition-opacity duration-150 peer-hover:opacity-100 peer-focus:opacity-100 sm:hidden"
            >
              {label}
            </span>
            <span
              className={cn(
                "hidden truncate text-caption font-semibold sm:block",
                active ? "text-maroon" : done ? "text-ink" : "text-ink-soft",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors duration-300",
                  done ? "bg-maroon" : "bg-cream-2",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Slim progress bar (0–100). */
export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-cream-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-maroon transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default Stepper;
