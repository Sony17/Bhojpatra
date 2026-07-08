import type { Metadata } from "next";
import ServicesView from "@/components/admin/services/ServicesView";

export const metadata: Metadata = { title: "Service Packages" };

export default function ServicesPage() {
  return <ServicesView />;
}
