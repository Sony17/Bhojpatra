import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import StallBookingWizard from "@/components/booking/StallBookingWizard";

export const metadata: Metadata = {
  title: "Book a Live Stall — Bhojpatra",
  description:
    "Book interactive live food counters and stations for your event — choose from Chaat, Dosa, Chinese, Pasta, Grills, and more from verified live stall specialists.",
};

export default function Page() {
  return (
    <PublicShell>
      <StallBookingWizard mode="live" />
    </PublicShell>
  );
}
