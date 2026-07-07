import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import FinalisedPackages from "@/components/showcase/FinalisedPackages";

export const metadata: Metadata = {
  title: "Choose Your Package — Bhojpatra",
  description:
    "Silver, Gold and Platinum as one clear value ladder — stat strips, an upgrade path, a full comparison and famous-vendor perks, all in the Bhojpatra theme.",
};

export default function FinalisePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <FinalisedPackages />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
