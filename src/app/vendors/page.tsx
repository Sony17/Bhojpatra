import { Suspense } from "react";
import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VendorCatalog from "@/components/vendors/VendorCatalog";
import { SkeletonList } from "@/components/ui";

export const metadata: Metadata = {
  title: "Vendors — Bhojpatra",
  description:
    "Browse and compare verified caterers across India. Search by cuisine or name and filter by city, state, diet and tier to find the perfect vendor for your feast.",
};

export default function VendorsPage() {
  return (
    <PublicShell>
      <Suspense fallback={<div className="px-4 py-6"><SkeletonList count={6} /></div>}>
        <VendorCatalog />
      </Suspense>
    </PublicShell>
  );
}
