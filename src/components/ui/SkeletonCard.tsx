import Skeleton from "./Skeleton";
import { cn } from "./cn";

/** Swiggy-style listing skeleton — image block + title/meta lines. */
export default function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-hero border border-maroon/6 bg-white shadow-soft",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" rounded="none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" rounded="control" />
        <Skeleton className="h-3 w-1/2" rounded="control" />
        <Skeleton className="mt-2 h-4 w-1/3" rounded="control" />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
