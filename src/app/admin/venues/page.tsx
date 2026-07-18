import type { Metadata } from "next";
import VenueManagement from "@/components/admin/venues/VenueManagement";

export const metadata: Metadata = { title: "Venues" };

export default function VenuesPage() {
  return <VenueManagement />;
}
