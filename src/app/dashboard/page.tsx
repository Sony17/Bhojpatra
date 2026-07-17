import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import AccountsDashboard from "@/components/dashboard/AccountsDashboard";
import RequireSession from "@/components/auth/RequireSession";

export const metadata: Metadata = {
  title: "My Dashboard — Bhojpatra",
  description:
    "Your Bhojpatra hub — bookings, vendor orders and referral earnings across every account you hold, in one place.",
};

export default function DashboardPage() {
  return (
    <PublicShell>
      <RequireSession role="customer">
        <AccountsDashboard />
      </RequireSession>
    </PublicShell>
  );
}
