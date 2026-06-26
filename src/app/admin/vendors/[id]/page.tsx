import type { Metadata } from "next";
import VendorDetail from "@/components/admin/vendors/VendorDetail";
import { getVendorById } from "@/lib/admin/mockData";

/** Vendor detail route. `params` is async in this Next version, so it's awaited. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vendor = getVendorById(id);
  return { title: vendor ? vendor.business : "Vendor" };
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = getVendorById(id) ?? null;
  return <VendorDetail vendor={vendor} />;
}
