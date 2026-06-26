import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import MyBookings from "@/components/bookings/MyBookings";

export const metadata: Metadata = {
  title: "My Bookings — Bhojpatra",
  description:
    "View and manage your Bhojpatra feast bookings — track confirmations, payments due and your celebration history.",
};

export default function BookingsPage() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <MyBookings />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
