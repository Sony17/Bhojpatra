import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VenueExplorer from "@/components/venues/VenueExplorer";

export const metadata: Metadata = {
  title: "Venues — Bhojpatra",
  description:
    "Discover banquet halls, lawns, resorts and convention centers near you. Filter venues by city and locality across India.",
};

export default function VenuesPage() {
  return (
    <PublicShell>
      <VenueExplorer />
    </PublicShell>
  );
}
