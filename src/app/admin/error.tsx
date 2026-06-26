"use client";

import { useEffect } from "react";

/**
 * App Router error boundary for `/admin/*`. Renders inside the admin shell when
 * a page throws (e.g. a failed data fetch once APIs are wired) and offers a
 * retry via `reset()`. Production-ready error placeholder.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook point: report to an error service when one is added.
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-cream-3 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream text-2xl text-maroon">
          !
        </span>
        <h1 className="mt-4 font-display text-xl text-ink">Something went wrong</h1>
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">
          We couldn&rsquo;t load this page. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
