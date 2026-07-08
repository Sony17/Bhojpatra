import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import ServicePackages from "@/components/sections/ServicePackages";

export const metadata: Metadata = {
  title: "Service Packages — Bhojpatra",
  description:
    "Choose your feast service package — from a single stall to a white-glove VIP experience.",
};

// Standalone preview of the "Choose Your Service Package" comparison. UI only —
// not yet wired into the booking flow, admin, or the order total.
export default function ServicePackagesPage() {
  return (
    <>
      <Header />
      {/* No hero here, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <ServicePackages />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
