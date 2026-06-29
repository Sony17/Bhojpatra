import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import SitePageView from "@/components/SitePageView";

export const metadata: Metadata = {
  title: "Terms & Privacy — Bhojpatra",
  description:
    "Bhojpatra's terms of use and privacy policy.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <SitePageView slug="terms" />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
