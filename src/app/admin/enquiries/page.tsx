import type { Metadata } from "next";
import Enquiries from "@/components/admin/enquiries/Enquiries";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return <Enquiries />;
}
