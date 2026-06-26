import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "Book a Feast — Bhojpatra",
  description:
    "Plan your celebration in a few guided steps — choose the occasion, build your menu, compare verified caterers, add live counters and confirm your booking.",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <BookingWizard />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
