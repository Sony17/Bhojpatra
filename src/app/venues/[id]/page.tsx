import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VenueDetail from "@/components/venues/VenueDetail";
import { staticBookableVenues } from "@/lib/venues";

/** Venue detail + booking route. `params` is async in this Next version. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Owner-registered venues aren't known at build time; the seed ones are.
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
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <VenueDetail id={id} />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
