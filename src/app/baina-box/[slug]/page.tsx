import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBainaBoxVendor } from "@/lib/bainaBoxData";
import BainaBoxDetail from "@/components/vendors/BainaBoxDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = getBainaBoxVendor(slug);
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
  const vendor = getBainaBoxVendor(slug);

  if (!vendor) {
    notFound();
  }

  return <BainaBoxDetail data={vendor} />;
}
