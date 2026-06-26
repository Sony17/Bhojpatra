import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import PartnerLanding from "@/components/partner/PartnerLanding";

export const metadata: Metadata = {
  title: "Partner With Us — Bhojpatra",
  description:
    "Grow your catering business with Bhojpatra, India's feast platform. List for free, reach lakhs of customers, get quality leads with zero upfront cost.",
};

export default function Partner() {
  return (
    <>
      <Header />
      {/* This page leads with its own full-width maroon hero band, so the
          main needs no top padding — the hero sits under the transparent
          header like the home page. */}
      <main className="flex-1">
        <PartnerLanding />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
