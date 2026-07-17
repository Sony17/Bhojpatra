import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "Book a Feast — Bhojpatra",
  description:
    "Plan your celebration in a few guided steps — choose the occasion, build your menu, compare verified caterers, add live counters and confirm your booking.",
};

export default function Page() {
  return (
    <PublicShell>
      <BookingWizard />
    </PublicShell>
  );
}
