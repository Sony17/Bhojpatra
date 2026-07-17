import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Empty / no-results panel for catalogs, bookings, compare, and admin tables.
 * Soft surface, minimal border — food-app empty, not a dashed admin box.
 */
export default function EmptyState({
  title,
  message,
  action,
  icon,
  className,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-hero border border-maroon/8 bg-white px-6 py-10 text-center shadow-soft sm:px-10 sm:py-12",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream text-maroon">
          {icon}
        </div>
      )}
      <p className="text-app-title text-ink">{title}</p>
      {message && (
        <p className="mx-auto mt-2 max-w-sm text-body text-ink/55">{message}</p>
      )}
      {action && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>
      )}
    </div>
  );
}
