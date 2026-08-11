import PublicShell from "@/components/app/PublicShell";
import VenueDetailSkeleton from "@/components/venues/VenueDetailSkeleton";

/**
 * Streaming fallback for the venue detail route.
 *
 * `[id]` is a dynamic segment, so any venue not covered by `generateStaticParams`
 * (i.e. every owner-registered one) is rendered on the server per request.
 * Without this boundary Next.js has nothing to prefetch and the click sits on
 * the catalogue until the server answers — the tap reads as ignored. With it,
 * the shell is prefetched and the transition paints immediately.
 */
export default function Loading() {
  return (
    <PublicShell detail>
      <VenueDetailSkeleton />
    </PublicShell>
  );
}
