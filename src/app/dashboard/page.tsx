import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import AccountsDashboard from "@/components/dashboard/AccountsDashboard";
import RequireSession from "@/components/auth/RequireSession";

export const metadata: Metadata = {
  title: "My Dashboard — Bhojpatra",
  description:
    "Your Bhojpatra hub — bookings, vendor orders and referral earnings across every account you hold, in one place.",
};

export default function DashboardPage() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        {/* Any signed-in person can reach the hub — customer is universal, so a
            "customer" gate is exactly "is signed in". The sections inside adapt
            to whichever accounts (vendor / referral) they also hold. */}
        <RequireSession role="customer">
          <AccountsDashboard />
        </RequireSession>
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
