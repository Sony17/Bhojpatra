import { redirect } from "next/navigation";

// Booking Management was merged into the unified "Customers & Bookings" page.
// Preserve any existing links by redirecting straight to the bookings tab.
export default function BookingsPage() {
  redirect("/admin/customers?tab=bookings");
}
