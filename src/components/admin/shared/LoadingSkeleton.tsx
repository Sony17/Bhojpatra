/**
 * Reusable loading skeleton for admin pages. Pure presentation, brand-toned,
 * uses Tailwind's `animate-pulse`. Rendered by the App Router `loading.tsx`
 * boundary during navigation/server work — and ready to drop into any list once
 * its data source becomes async.
 */
interface LoadingSkeletonProps {
  /** Number of placeholder table rows. */
  rows?: number;
}

function Bar({ className = "" }: { className?: string }) {
  return <div className={"animate-pulse rounded bg-cream-3/70 " + className} />;
}

export default function LoadingSkeleton({ rows = 6 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-7 w-64" />
        <Bar className="h-4 w-80" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
            <Bar className="h-11 w-11 rounded-full" />
            <Bar className="mt-4 h-7 w-20" />
            <Bar className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
        <div className="border-b border-cream-3 bg-cream-2 px-4 py-3">
          <Bar className="h-3 w-40" />
        </div>
        <div className="divide-y divide-cream-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-4">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-4 w-1/5" />
              <Bar className="h-4 w-1/6" />
              <Bar className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
