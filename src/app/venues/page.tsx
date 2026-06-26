import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VenueExplorer from "@/components/venues/VenueExplorer";

export const metadata: Metadata = {
  title: "Venues — Bhojpatra",
  description:
    "Discover banquet halls, lawns, resorts and convention centers near you. Filter venues by city and locality across India.",
};

export default function VenuesPage() {
  return (
    <>
      <Header />
      {/* Header is absolutely positioned over the hero on the home page; on
          this page there is no hero, so pad the top to clear the nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <VenueExplorer />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
