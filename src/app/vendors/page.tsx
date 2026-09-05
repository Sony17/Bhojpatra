import { Suspense } from "react";
import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VendorCatalog from "@/components/vendors/VendorCatalog";
import { SkeletonList } from "@/components/ui";

export const metadata: Metadata = {
  title: "Caterers — Bhojpatra",
  description:
    "Browse and compare trusted caterers across India. Search by cuisine or name, filter by city and budget, and find the perfect caterer for your feast.",
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
