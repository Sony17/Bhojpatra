import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorCatalog from "@/components/vendors/VendorCatalog";

export const metadata: Metadata = {
  title: "Vendors — Bhojpatra",
  description:
    "Browse and compare verified caterers across India. Search by cuisine or name and filter by city, state, diet and tier to find the perfect vendor for your feast.",
};

export default function VendorsPage() {
  return (
    <>
      <Header />
      {/* Header is absolutely positioned over the hero on the home page; on
          this page there is no hero, so pad the top to clear the nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        {/* VendorCatalog reads ?q= via useSearchParams, which requires a
            Suspense boundary on a statically prerendered page. */}
        <Suspense fallback={null}>
          <VendorCatalog />
        </Suspense>
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
