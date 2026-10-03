import type { Metadata } from "next";
import RequireSession from "@/components/auth/RequireSession";
import VendorDashboard from "@/components/vendor/VendorDashboard";

export const metadata: Metadata = {
  title: "Vendor Dashboard — Bhojpatra",
  description:
    "Manage your catering business on Bhojpatra — review booking requests, track your order calendar, monitor earnings and update your profile.",
};

// The Vendor Portal owns the full viewport (own sidebar / topbar / bottom nav),
// so it renders outside PublicShell — no site header, footer or tab bar.
export default function VendorDashboardPage() {
  return (
    <RequireSession role="vendor">
      <VendorDashboard />
    </RequireSession>
  );
}
