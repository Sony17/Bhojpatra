import { Suspense } from "react";
import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VendorCatalog from "@/components/vendors/VendorCatalog";
import { SkeletonList } from "@/components/ui";
import { VendorsSeed } from "@/lib/useAllVendors";
import { loadCatalogSnapshot } from "@/lib/catalogSnapshot";

export const metadata: Metadata = {
  title: "Caterers — Bhojpatra",
  description:
    "Browse and compare trusted caterers across India. Search by cuisine or name, filter by city and budget, and find the perfect caterer for your feast.",
};

export default async function VendorsPage() {
  // The live roster, read here so the list paints on the first frame — never
  // "0 caterers / No caterers found" swapping to results a second later.
  const catalog = await loadCatalogSnapshot();
  return (
    <PublicShell>
      <VendorsSeed initial={catalog?.vendors}>
        <Suspense fallback={<div className="px-4 py-6"><SkeletonList count={6} /></div>}>
          <VendorCatalog />
        </Suspense>
      </VendorsSeed>
    </PublicShell>
  );
}
