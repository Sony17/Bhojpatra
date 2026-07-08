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
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200",
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
