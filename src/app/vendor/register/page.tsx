import type { Metadata } from "next";
import RegistrationGateway from "@/components/vendor/onboarding/RegistrationGateway";

export const metadata: Metadata = {
  title: "Vendor Registration & Onboarding — Bhojpatra",
  description:
    "Register your catering business on Bhojpatra. Free to list — complete your brand identity, statutory KYC compliance, service coverage, and custom stations.",
};

export default function VendorRegisterPage() {
  // The signed-in vendor onboarding owns the full viewport (prototype shell);
  // the gateway wraps its signed-out / non-vendor screens in PublicShell itself.
  return <RegistrationGateway />;
}
