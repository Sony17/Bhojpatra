import type { Metadata } from "next";
import DashboardRouter from "@/components/auth/DashboardRouter";

export const metadata: Metadata = {
  title: "My Dashboard — Bhojpatra",
  description:
    "Your Bhojpatra dashboard — bookings for customers, orders for vendors, referrals for partners.",
};

/**
 * One email ↔ one role ↔ one dashboard. This route is just the post-login
 * router: it reads the session's single role and forwards to that role's
 * dedicated dashboard (customer → /bookings, vendor → /vendor/dashboard,
 * partner → /partner/dashboard). Signed-out visitors go to /login.
 */
export default function DashboardPage() {
  return <DashboardRouter />;
}
