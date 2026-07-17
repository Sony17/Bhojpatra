import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import MyBookings from "@/components/bookings/MyBookings";
import RequireSession from "@/components/auth/RequireSession";

export const metadata: Metadata = {
  title: "My Dashboard — Bhojpatra",
  description:
    "View and manage your Bhojpatra feast bookings — track confirmations, payments due and your celebration history.",
};

export default function BookingsPage() {
  return (
    <PublicShell>
      <RequireSession role="customer">
        <MyBookings />
      </RequireSession>
    </PublicShell>
  );
}
