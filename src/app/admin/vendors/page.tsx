import type { Metadata } from "next";
import VendorList from "@/components/admin/vendors/VendorList";

export const metadata: Metadata = {
  title: "Vendor Management",
};

export default function VendorsPage() {
  return <VendorList />;
}
