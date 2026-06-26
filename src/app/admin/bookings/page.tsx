import type { Metadata } from "next";
import BookingManagement from "@/components/admin/bookings/BookingManagement";

export const metadata: Metadata = { title: "Booking Management" };

export default function BookingsPage() {
  return <BookingManagement />;
}
