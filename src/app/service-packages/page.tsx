import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import ServicePackages from "@/components/sections/ServicePackages";

export const metadata: Metadata = {
  title: "Service Packages — Bhojpatra",
  description:
    "Choose your feast service package — from a single stall to a white-glove VIP experience.",
};

export default function ServicePackagesPage() {
  return (
    <PublicShell>
      <ServicePackages />
    </PublicShell>
  );
}
