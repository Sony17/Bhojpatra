import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import ContactPage from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact Us — Bhojpatra",
  description:
    "Get in touch with Bhojpatra — India's Feast Booking Platform. Chat on WhatsApp, call us, or send an enquiry for your next celebration.",
};

export default function Contact() {
  return (
    <PublicShell>
      <ContactPage />
    </PublicShell>
  );
}
