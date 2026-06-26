import type { ReactNode } from "react";

/**
 * Standard widget shell ("summary card") for the dashboard and future admin
 * pages. Every panel-style widget renders inside one of these so card chrome
 * (radius, border, shadow, padding, header) stays consistent in one place.
 *
 * The `action` slot is the per-widget EXTENSION POINT — a "See all" link today,
 * and where a filter chip, date-range selector or export button can be dropped
 * in later without changing the widget body.
 */
interface WidgetCardProps {
  title?: string;
  /** Right-aligned header slot: links now; filters / export / date-range later. */
  action?: ReactNode;
  /** Extra classes on the card (e.g. grid column spans). */
  className?: string;
  children: ReactNode;
}

export default function WidgetCard({
  title,
  action,
  className = "",
  children,
}: WidgetCardProps) {
  return (
    <section
      className={
        "rounded-2xl border border-cream-3 bg-white p-5 shadow-sm " + className
      }
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
          )}
          {action && <div className="flex items-center gap-2.5">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
