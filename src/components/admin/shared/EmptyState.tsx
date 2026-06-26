import type { ReactNode } from "react";

/**
 * Reusable empty / "nothing here" panel. Used by tables (no results), detail
 * tabs (feature not built yet) and future modules.
 */
interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-10 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {message && (
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">{message}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
