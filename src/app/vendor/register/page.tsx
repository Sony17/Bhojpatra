import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorRegister from "@/components/vendor/VendorRegister";

export const metadata: Metadata = {
  title: "Vendor Registration — Bhojpatra",
  description:
    "Register your catering business on Bhojpatra. Free to list — complete your business, KYC, menu and coverage details and go live after admin verification.",
};

export default function VendorRegisterPage() {
  return (
    <>
      <Header />
      {/* Header is absolutely positioned over the hero on the home page; on
          this page there is no hero, so pad the top to clear the nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <VendorRegister />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
