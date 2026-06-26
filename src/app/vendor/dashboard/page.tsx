import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import VendorDashboard from "@/components/vendor/VendorDashboard";

export const metadata: Metadata = {
  title: "Vendor Dashboard — Bhojpatra",
  description:
    "Manage your catering business on Bhojpatra — review booking requests, track your order calendar, monitor earnings and update your profile.",
};

export default function VendorDashboardPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <VendorDashboard />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
