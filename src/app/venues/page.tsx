import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VenueExplorer from "@/components/venues/VenueExplorer";
import { listPublicVenueRecords } from "@/lib/venuesServer";

export const metadata: Metadata = {
  title: "Venues — Bhojpatra",
  description:
    "Discover banquet halls, lawns, resorts and convention centers near you. Filter venues by city and locality across India.",
};

export default async function VenuesPage() {
  // The live catalogue, read here so the first frame already lists every venue
  // (no seed-count → live-count swap).
  const initialVenues = await listPublicVenueRecords();
  return (
    <PublicShell>
      <VenueExplorer initialVenues={initialVenues} />
    </PublicShell>
  );
}
