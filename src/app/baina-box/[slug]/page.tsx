import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBainaBoxVendor } from "@/lib/bainaBoxData";
import { vendorListings } from "@/lib/data";
import { listLiveVendorListings } from "@/lib/vendorMenus";
import BainaBoxDetail from "@/components/vendors/BainaBoxDetail";

export const dynamic = "force-dynamic";

async function loadVendor(slug: string) {
  let liveVendors: any[] = [];
  try {
    liveVendors = await listLiveVendorListings();
  } catch {
    liveVendors = [];
  }
  const allListings = [...vendorListings, ...liveVendors];
  return getBainaBoxVendor(slug, allListings);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await loadVendor(slug);
  if (!vendor) {
    return {
      title: "Baina Box — Bhojpatra",
    };
  }

  return {
    title: `${vendor.name} — Baina Box — Bhojpatra`,
    description: `${vendor.name}, ${vendor.location} — Premium Baina Boxes from ₹${vendor.fixedPrice}/${vendor.priceUnit} on Bhojpatra.`,
  };
}

export default async function BainaBoxVendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await loadVendor(slug);

  if (!vendor) {
    notFound();
  }

  return <BainaBoxDetail data={vendor} />;
}
