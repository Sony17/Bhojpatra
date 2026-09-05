import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import RequireSession from "@/components/auth/RequireSession";
import VendorDashboard from "@/components/vendor/VendorDashboard";

export const metadata: Metadata = {
  title: "Vendor Dashboard — Bhojpatra",
  description:
    "Manage your catering business on Bhojpatra — review booking requests, track your order calendar, monitor earnings and update your profile.",
};

export default function VendorDashboardPage() {
  return (
    <PublicShell>
      <RequireSession role="vendor">
        <VendorDashboard />
      </RequireSession>
    </PublicShell>
  );
}
