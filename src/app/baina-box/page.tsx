import type { Metadata } from "next";
import BainaBoxOverview from "@/components/vendors/BainaBoxOverview";
import { loadCatalogSnapshot } from "@/lib/catalogSnapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Baina Box & Sweet Box Marketplace — Bhojpatra",
  description:
    "Explore premium Baina Boxes, mithai gift hampers, and festive sweet packages from sweet houses on Bhojpatra.",
};

export default async function BainaBoxOverviewPage() {
  // Live sweet houses, read here so the list paints on the first frame.
  const catalog = await loadCatalogSnapshot();
  return <BainaBoxOverview initialVendors={catalog?.vendors} />;
}
