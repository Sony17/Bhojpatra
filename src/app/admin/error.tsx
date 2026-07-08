"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

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
      <div className="max-w-md rounded-card border border-cream-3 bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream text-2xl text-maroon">
          !
        </span>
        <h1 className="mt-4 font-display text-xl text-ink">Something went wrong</h1>
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">
          We couldn&rsquo;t load this page. Please try again.
        </p>
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
