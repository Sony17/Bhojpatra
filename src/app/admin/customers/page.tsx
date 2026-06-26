import type { Metadata } from "next";
import CustomerManagement from "@/components/admin/customers/CustomerManagement";

export const metadata: Metadata = { title: "Customer Management" };

export default function CustomersPage() {
  return <CustomerManagement />;
}
