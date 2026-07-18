"use client";

/**
 * Reports — tabular, exportable summaries for finance/ops. Numbers-first (as
 * opposed to Analytics, which is the visual/chart view of the same data). Every
 * table can be pulled to CSV.
 */

import { useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import Tabs from "@/components/admin/shared/Tabs";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { money } from "@/components/admin/shared/money";
import { BarChart, Wallet, Calendar, Store } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import {
  revenueSummary,
  revenueTrend,
  bookingsTrend,
  vendorPerformance,
  topCitiesTrend,
} from "@/lib/admin/mockData";

/** Revenue trend values are in ₹ lakh; expand to rupees for money(). */
const LAKH = 100000;

interface MonthlyRow {
  month: string;
  revenue: number;
  bookings: number;
}

export default function ReportsView() {
  const [tab, setTab] = useState("monthly");

  const monthly: MonthlyRow[] = useMemo(
    () =>
      revenueTrend.map((r, i) => ({
        month: r.label,
        revenue: r.value * LAKH,
        bookings: bookingsTrend[i]?.value ?? 0,
      })),
    [],
  );

  const totals = useMemo(
    () => ({
      revenue: revenueSummary.total,
      bookings: bookingsTrend.reduce((s, b) => s + b.value, 0),
      vendors: vendorPerformance.length,
      topCity: topCitiesTrend[0]?.label ?? "—",
    }),
    [],
  );

  const exportMonthly = () =>
    exportCsv(
      "bhojpatra-monthly-report.csv",
      monthly.map((m) => ({ Month: m.month, Revenue: m.revenue, Bookings: m.bookings })),
    );

  const exportVendors = () =>
    exportCsv(
      "bhojpatra-vendor-report.csv",
      vendorPerformance.map((v) => ({
        Vendor: v.vendor,
        Bookings: v.bookings,
        Revenue: v.revenue,
        Rating: v.rating,
      })),
    );

  const exportCities = () =>
    exportCsv(
      "bhojpatra-city-report.csv",
      topCitiesTrend.map((c) => ({ City: c.label, Bookings: c.value })),
    );

  const monthlyCols: Column<MonthlyRow>[] = [
    { key: "month", header: "Month", cell: (m) => <span className="font-medium text-ink">{m.month}</span> },
    { key: "bookings", header: "Bookings", cell: (m) => <span className="text-ink-soft">{m.bookings}</span> },
    {
      key: "revenue",
      header: "Revenue",
      cell: (m) => <span className="font-display font-semibold text-ink">{money(m.revenue)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const vendorCols: Column<(typeof vendorPerformance)[number]>[] = [
    { key: "vendor", header: "Vendor", cell: (v) => <span className="font-medium text-ink">{v.vendor}</span> },
    { key: "bookings", header: "Bookings", cell: (v) => <span className="text-ink-soft">{v.bookings}</span> },
    { key: "rating", header: "Rating", cell: (v) => <span className="text-ink-soft">{v.rating.toFixed(1)} ★</span> },
    {
      key: "revenue",
      header: "Revenue",
      cell: (v) => <span className="font-display font-semibold text-ink">{money(v.revenue)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const cityCols: Column<(typeof topCitiesTrend)[number]>[] = [
    { key: "label", header: "City", cell: (c) => <span className="font-medium text-ink">{c.label}</span> },
    {
      key: "value",
      header: "Bookings",
      cell: (c) => <span className="font-display font-semibold text-ink">{c.value}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const TABS = [
    { id: "monthly", label: "Monthly Revenue" },
    { id: "vendors", label: "Vendor Performance" },
    { id: "cities", label: "Top Cities" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Reports"
        subtitle="Downloadable revenue, vendor and city summaries."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Revenue (YTD)" value={money(totals.revenue)} />
        <StatCard icon={Calendar} label="Bookings (YTD)" value={String(totals.bookings)} />
        <StatCard icon={Store} label="Vendors Tracked" value={String(totals.vendors)} />
        <StatCard icon={BarChart} label="Top City" value={totals.topCity} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "monthly" && (
        <WidgetCard
          title="Monthly Revenue & Bookings"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={exportMonthly}>
              Export CSV
            </Button>
          }
        >
          <DataTable columns={monthlyCols} rows={monthly} getRowKey={(m) => m.month} bare minWidthClass="min-w-[480px]" />
        </WidgetCard>
      )}

      {tab === "vendors" && (
        <WidgetCard
          title="Vendor Performance"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={exportVendors}>
              Export CSV
            </Button>
          }
        >
          <DataTable columns={vendorCols} rows={vendorPerformance} getRowKey={(v) => v.vendor} bare minWidthClass="min-w-[520px]" />
        </WidgetCard>
      )}

      {tab === "cities" && (
        <WidgetCard
          title="Top Cities by Bookings"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={exportCities}>
              Export CSV
            </Button>
          }
        >
          <DataTable columns={cityCols} rows={topCitiesTrend} getRowKey={(c) => c.label} bare minWidthClass="min-w-[360px]" />
        </WidgetCard>
      )}
    </div>
  );
}
