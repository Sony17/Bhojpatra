import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import SitePageView from "@/components/SitePageView";
import AboutHighlights from "@/components/about/AboutHighlights";

export const metadata: Metadata = {
  title: "About Us — Bhojpatra",
  description:
    "Learn about Bhojpatra — India's Feast Booking Platform connecting you with verified catering specialists.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <SitePageView slug="about" />
        <AboutHighlights />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
