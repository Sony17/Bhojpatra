import { Suspense } from "react";
import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import VendorCatalog from "@/components/vendors/VendorCatalog";
import { SkeletonList } from "@/components/ui";
import { VendorsSeed } from "@/lib/useAllVendors";
import { loadCatalogSnapshot } from "@/lib/catalogSnapshot";
import { loadStallTileImages } from "@/lib/stallTileImagesServer";

export const metadata: Metadata = {
  title: "Caterers — Bhojpatra",
  description:
    "Browse and compare trusted caterers across India. Search by cuisine or name, filter by city and budget, and find the perfect caterer for your feast.",
};

export default async function VendorsPage() {
  // The live roster, read here so the list paints on the first frame — never
  // "0 caterers / No caterers found" swapping to results a second later.
  // The admin's stall-tile photos too, so a stall-type header (?counter=)
  // shows the same picture as the tile that led here.
  const [catalog, tileImages] = await Promise.all([
    loadCatalogSnapshot(),
    loadStallTileImages(),
  ]);
  return (
    <PublicShell>
      <VendorsSeed initial={catalog?.vendors}>
        <Suspense fallback={<div className="px-4 py-6"><SkeletonList count={6} /></div>}>
          <VendorCatalog tileImages={tileImages} />
        </Suspense>
      </VendorsSeed>
    </PublicShell>
  );
}
