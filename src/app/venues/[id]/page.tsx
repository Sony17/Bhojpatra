import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VenueDetail from "@/components/venues/VenueDetail";
import { staticBookableVenues } from "@/lib/venues";

/**
 * Prerender the seeded catalogue at build time. A dynamic segment with no
 * `generateStaticParams` falls back to per-request rendering, which means
 * `<Link>` can't prefetch the route and every tap pays a server round trip
 * before anything moves. These ids are known at build, so the seeded venues
 * become static and their cards prefetch in full — the tap is instant.
 *
 * Owner-registered venues aren't known here; `dynamicParams` (default) still
 * renders those on demand, with `loading.tsx` covering the wait.
 */
export function generateStaticParams(): { id: string }[] {
  return staticBookableVenues.map((v) => ({ id: v.id }));
}

/** Venue detail + booking route. `params` is async in this Next version. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seed = staticBookableVenues.find((v) => v.id === id);
  return {
    title: seed ? `${seed.name} — Bhojpatra` : "Venue — Bhojpatra",
    description: seed
      ? `Book ${seed.name} in ${seed.location} — capacity ${seed.capacity}, from ${seed.priceFrom}.`
      : "Select, book and pay for your venue on Bhojpatra.",
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PublicShell detail>
      <VenueDetail id={id} />
    </PublicShell>
  );
}
