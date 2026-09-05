import type { Metadata } from "next";
import VendorDetail from "@/components/admin/vendors/VendorDetail";
import {
  getAdminVendorById,
  getAdminVendorItemLimits,
} from "@/lib/admin/vendors";

/** Vendor detail route. `params` is async in this Next version, so it's awaited. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vendor = await getAdminVendorById(id);
  return { title: vendor ? vendor.business : "Vendor" };
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vendor, itemLimits] = await Promise.all([
    getAdminVendorById(id),
    getAdminVendorItemLimits(id),
  ]);
  return <VendorDetail vendor={vendor} itemLimits={itemLimits} />;
}
