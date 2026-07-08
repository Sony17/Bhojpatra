"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import StatCard from "@/components/admin/shared/StatCard";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import BarChart from "@/components/admin/shared/BarChart";
import { money } from "@/components/admin/shared/money";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { BarChart as BarIcon, Wallet, Calendar } from "@/components/admin/shared/icons";
import {
  revenueTrend,
  bookingsTrend,
  topCitiesTrend,
  vendorPerformance,
} from "@/lib/admin/mockData";
import type { VendorPerfRow } from "@/lib/admin/types";

const TABS: TabItem[] = [
  { id: "revenue", label: "Revenue" },
  { id: "bookings", label: "Bookings" },
  { id: "vendors", label: "Vendor Performance" },
];

/**
 * Reports & analytics, merged into the dashboard as a single row. Carries the
 * tabbed revenue / bookings / vendor views (formerly the standalone Reports
 * page) under its own section heading so the dashboard is the one place admins
 * read both their at-a-glance widgets and their deeper analytics.
 */
export default function AnalyticsSection() {
  const [tab, setTab] = useState("revenue");

  const onExport = () => {
    if (tab === "revenue") {
      exportCsv("revenue-by-month.csv", revenueTrend.map((p) => ({ month: p.label, revenue_lakh: p.value })));
    } else if (tab === "bookings") {
      exportCsv("bookings-by-month.csv", bookingsTrend.map((p) => ({ month: p.label, bookings: p.value })));
    } else {
      exportCsv("vendor-performance.csv", vendorPerformance.map((v) => ({ vendor: v.vendor, bookings: v.bookings, revenue: v.revenue, rating: v.rating })));
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Reports &amp; Analytics</h2>
          <p className="mt-0.5 text-sm text-ink-soft">Revenue, bookings and performance analytics.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onExport}>
          Export CSV
        </Button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "revenue" && <RevenueTab />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "vendors" && <VendorsTab />}
    </section>
  );
}

function RevenueTab() {
  const total = revenueTrend.reduce((s, p) => s + p.value, 0);
  const best = revenueTrend.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Revenue (YTD)" value={`₹${total}L`} />
        <StatCard icon={Wallet} label="Avg / Month" value={`₹${Math.round(total / revenueTrend.length)}L`} />
        <StatCard icon={Wallet} label="Best Month" value={`${best.label} · ₹${best.value}L`} />
      </div>
      <WidgetCard title="Revenue by Month (₹ Lakh)">
        <BarChart data={revenueTrend} formatValue={(n) => `₹${n}L`} />
      </WidgetCard>
      <WidgetCard title="Top Cities by Bookings">
        <BarChart data={topCitiesTrend} />
      </WidgetCard>
    </div>
  );
}

function BookingsTab() {
  const total = bookingsTrend.reduce((s, p) => s + p.value, 0);
  const best = bookingsTrend.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Calendar} label="Bookings (YTD)" value={String(total)} />
        <StatCard icon={Calendar} label="Avg / Month" value={String(Math.round(total / bookingsTrend.length))} />
        <StatCard icon={BarIcon} label="Best Month" value={`${best.label} · ${best.value}`} />
      </div>
      <WidgetCard title="Bookings by Month">
        <BarChart data={bookingsTrend} />
      </WidgetCard>
    </div>
  );
}

function VendorsTab() {
  const columns: Column<VendorPerfRow>[] = [
    { key: "vendor", header: "Vendor", cell: (v) => <span className="font-medium text-ink">{v.vendor}</span> },
    { key: "bookings", header: "Bookings", cell: (v) => <span className="text-ink-soft">{v.bookings}</span> },
    {
      key: "revenue",
      header: "Revenue",
      cell: (v) => <span className="font-display font-semibold text-ink">{money(v.revenue)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "rating", header: "Rating", cell: (v) => <span className="text-ink">{v.rating} ★</span> },
  ];
  return <DataTable columns={columns} rows={vendorPerformance} getRowKey={(v) => v.vendor} minWidthClass="min-w-[560px]" />;
}
