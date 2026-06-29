import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import SitePageView from "@/components/SitePageView";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Bhojpatra",
  description:
    "Bhojpatra's refund and cancellation policy for catering and feast bookings.",
};

export default function RefundPage() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <SitePageView slug="refund" />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
