"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/admin/shared/PageHeader";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import CustomerManagement from "@/components/admin/customers/CustomerManagement";
import BookingManagement from "@/components/admin/bookings/BookingManagement";

const TABS: TabItem[] = [
  { id: "customers", label: "Customers" },
  { id: "bookings", label: "Bookings" },
];

/**
 * Unified "Customers & Bookings" workspace. Combines the customer directory and
 * the booking ledger under one route with pill tabs. The initial tab honours a
 * `?tab=bookings` deep-link (e.g. from the dashboard) so existing links keep
 * landing on the right view.
 */
export default function CustomerBookingManagement() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("tab") === "bookings" ? "bookings" : "customers";
  const [tab, setTab] = useState(initial);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Customers & Bookings"
        subtitle="Manage customers, their lifetime value and every booking across the marketplace."
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "customers" && <CustomerManagement />}
      {tab === "bookings" && <BookingManagement />}
    </div>
  );
}
