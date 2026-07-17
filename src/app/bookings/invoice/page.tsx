import type { Metadata } from "next";
import { Suspense } from "react";
import PublicShell from "@/components/app/PublicShell";
import InvoiceViewer from "@/components/bookings/InvoiceViewer";

export const metadata: Metadata = {
  title: "Invoice — Bhojpatra",
  description: "View and download a Bhojpatra feast invoice.",
};

export const dynamic = "force-dynamic";

export default function SharedInvoicePage() {
  return (
    <PublicShell chat={false}>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <InvoiceViewer />
      </Suspense>
    </PublicShell>
  );
}
