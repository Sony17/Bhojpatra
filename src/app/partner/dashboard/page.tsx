import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import RequireSession from "@/components/auth/RequireSession";
import PartnerDashboard from "@/components/partner/PartnerDashboard";

export const metadata: Metadata = {
  title: "Partner Dashboard — Bhojpatra",
  description:
    "Track the feasts you've referred to Bhojpatra — share your referral link, watch confirmed bookings roll in and settle your earnings with our team.",
};

export default function PartnerDashboardPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <RequireSession role="partner">
          <PartnerDashboard />
        </RequireSession>
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
