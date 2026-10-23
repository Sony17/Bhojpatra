import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import CompareView from "@/components/vendors/CompareView";
import { VendorsSeed } from "@/lib/useAllVendors";
import { loadCatalogSnapshot } from "@/lib/catalogSnapshot";

export const metadata: Metadata = {
  title: "Compare Caterers — Bhojpatra",
  description:
    "Compare verified caterers side-by-side — price, rating, cuisines, diet, tiers and more — to pick the right one for your feast.",
};

export default async function ComparePage() {
  // Live roster read here so picked live caterers resolve on the first frame.
  const catalog = await loadCatalogSnapshot();
  return (
    <PublicShell>
      <VendorsSeed initial={catalog?.vendors}>
        <CompareView />
      </VendorsSeed>
    </PublicShell>
  );
}
