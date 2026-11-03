import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import BookingWizard from "@/components/booking/BookingWizard";
import FeastNoticeBanner from "@/components/sections/FeastNoticeBanner";
import { FEAST_BOOKING_OPEN } from "@/lib/launchFlags";

export const metadata: Metadata = {
  title: "Book a Feast — Bhojpatra",
  description:
    "Plan your celebration in a few guided steps — choose the occasion, build your menu, compare verified caterers, add live counters and confirm your booking.",
};

export default function Page() {
  return (
    <PublicShell>
      {/* Until Feast bookings open (2027), a dismissible notice points guests
          to the home-page feast packages (interest popup). Flip
          FEAST_BOOKING_OPEN to drop the banner. */}
      {!FEAST_BOOKING_OPEN && <FeastNoticeBanner />}
      <BookingWizard />
    </PublicShell>
  );
}
