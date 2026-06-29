import type { Metadata } from "next";
import CustomerBookingManagement from "@/components/admin/customers/CustomerBookingManagement";

export const metadata: Metadata = { title: "Customers & Bookings" };

export default function CustomersPage() {
  return <CustomerBookingManagement />;
}
