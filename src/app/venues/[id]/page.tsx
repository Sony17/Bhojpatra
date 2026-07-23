import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VenueDetail from "@/components/venues/VenueDetail";
import { staticBookableVenues } from "@/lib/venues";

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
