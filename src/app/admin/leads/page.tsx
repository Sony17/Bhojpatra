import type { Metadata } from "next";
import LeadGeneration from "@/components/admin/leads/LeadGeneration";

export const metadata: Metadata = { title: "Lead Generation" };

export default function LeadsPage() {
  return <LeadGeneration />;
}
