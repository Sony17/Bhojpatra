import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import RegistrationGateway from "@/components/vendor/onboarding/RegistrationGateway";

export const metadata: Metadata = {
  title: "Vendor Registration & Onboarding — Bhojpatra",
  description:
    "Register your catering business on Bhojpatra. Free to list — complete your brand identity, statutory KYC compliance, service coverage, and custom stations.",
};

export default function VendorRegisterPage() {
  return (
    <PublicShell>
      <RegistrationGateway />
    </PublicShell>
  );
}
