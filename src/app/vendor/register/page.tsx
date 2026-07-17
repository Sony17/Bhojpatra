import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import RequireSession from "@/components/auth/RequireSession";
import VendorRegister from "@/components/vendor/VendorRegister";

export const metadata: Metadata = {
  title: "Vendor Registration — Bhojpatra",
  description:
    "Register your catering business on Bhojpatra. Free to list — complete your business, KYC, menu and coverage details and go live after admin verification.",
};

export default function VendorRegisterPage() {
  return (
    <PublicShell>
      <RequireSession role="vendor">
        <VendorRegister />
      </RequireSession>
    </PublicShell>
  );
}
