import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import StallBookingWizard from "@/components/booking/StallBookingWizard";

export const metadata: Metadata = {
  title: "Book a Single Stall — Bhojpatra",
  description:
    "Book one trusted stall for your celebration — pick the caterer, build their menu dish by dish, and pay only for what you pick. Simple as that.",
};

export default function Page() {
  return (
    <PublicShell>
      <StallBookingWizard />
    </PublicShell>
  );
}
