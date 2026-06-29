import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InvoiceViewer from "@/components/bookings/InvoiceViewer";

export const metadata: Metadata = {
  title: "Invoice — Bhojpatra",
  description: "View and download a Bhojpatra feast invoice.",
};

// The invoice rides entirely in the URL, so nothing here is prerenderable.
export const dynamic = "force-dynamic";

export default function SharedInvoicePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-28 sm:pt-32">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <InvoiceViewer />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
