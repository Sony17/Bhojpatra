import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import ContactPage from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact Us — Bhojpatra",
  description:
    "Get in touch with Bhojpatra — India's Feast Booking Platform. Chat on WhatsApp, call us, or send an enquiry for your next celebration.",
};

export default function Contact() {
  return (
    <>
      <Header />
      {/* No hero on this page, so pad the top to clear the fixed nav bar. */}
      <main className="flex-1 pt-28 sm:pt-32">
        <ContactPage />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
