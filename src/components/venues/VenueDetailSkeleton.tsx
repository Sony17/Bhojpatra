import { Skeleton } from "@/components/ui";

/**
 * Placeholder for the venue detail screen, mirroring its real layout so the
 * page doesn't jump once the record lands.
 *
 * Used twice: as the route's `loading.tsx` (so tapping a venue card paints
 * *something* immediately instead of freezing on the catalogue while the
 * server responds), and inside `VenueDetail` for the case where we hold no
 * cached record yet — a direct link or refresh of an owner-registered venue.
 */
export default function VenueDetailSkeleton() {
  return (
    <section className="app-bottom-safe mx-auto max-w-6xl sm:px-8 sm:py-6 lg:py-10">
      <div className="mb-2 flex items-center gap-3 bg-white px-4 py-3 sm:rounded-b-hero">
        <Skeleton className="h-9 w-9" rounded="full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/5" rounded="control" />
          <Skeleton className="h-3 w-1/3" rounded="control" />
        </div>
      </div>

      <div className="mt-2 grid gap-8 px-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:px-0">
        <div>
          <Skeleton className="aspect-[4/3] w-full rounded-hero" rounded="none" />
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-7 w-3/5" rounded="control" />
            <Skeleton className="h-3.5 w-2/5" rounded="control" />
            <Skeleton className="h-3.5 w-1/3" rounded="control" />
          </div>
          <Skeleton className="mt-5 h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </section>
  );
}
