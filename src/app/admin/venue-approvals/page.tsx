import type { Metadata } from "next";
import VenueApprovalsConsole from "@/components/admin/venues/VenueApprovalsConsole";

export const metadata: Metadata = {
  title: "Venue Approvals",
};

export default function VenueApprovalsPage() {
  return <VenueApprovalsConsole />;
}
