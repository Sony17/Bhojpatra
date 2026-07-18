import type { Metadata } from "next";
import BookingManagement from "@/components/admin/bookings/BookingManagement";

export const metadata: Metadata = { title: "Bookings" };

export default function BookingsPage() {
  return <BookingManagement />;
}
