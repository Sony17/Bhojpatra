import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import PartnerLanding from "@/components/partner/PartnerLanding";

export const metadata: Metadata = {
  title: "Partner With Us — Bhojpatra",
  description:
    "Grow your catering business with Bhojpatra, India's feast platform. List for free, reach lakhs of customers, get quality leads with zero upfront cost.",
};

export default function Partner() {
  return (
    <PublicShell hero>
      <PartnerLanding />
    </PublicShell>
  );
}
