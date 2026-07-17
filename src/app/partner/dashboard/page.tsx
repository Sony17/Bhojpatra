import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import RequireSession from "@/components/auth/RequireSession";
import PartnerDashboard from "@/components/partner/PartnerDashboard";

export const metadata: Metadata = {
  title: "Partner Dashboard — Bhojpatra",
  description:
    "Track the feasts you've referred to Bhojpatra — share your referral link, watch confirmed bookings roll in and settle your earnings with our team.",
};

export default function PartnerDashboardPage() {
  return (
    <PublicShell>
      <RequireSession role="partner">
        <PartnerDashboard />
      </RequireSession>
    </PublicShell>
  );
}
