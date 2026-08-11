import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import StallBookingWizard from "@/components/booking/StallBookingWizard";

export const metadata: Metadata = {
  title: "Book a Single Stall — Bhojpatra",
  description:
    "Book one verified stall for your celebration — pick the vendor, build their menu dish by dish, and pay only for what you select. No packages, no tiers.",
};

export default function Page() {
  return (
    <PublicShell>
      <StallBookingWizard />
    </PublicShell>
  );
}
