"use client";

/**
 * Analytics — the VISUAL/chart view of the very same figures Reports shows as
 * tables. Reports is numbers-first (exportable rows); Analytics renders the
 * identical `revenueTrend` / `bookingsTrend` / `topCitiesTrend` /
 * `vendorPerformance` data as lightweight, dependency-free CSS charts (plain
 * divs sized by inline height/width — no charting library) in brand colours.
 */

import { useMemo } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { money } from "@/components/admin/shared/money";
import { Wallet, Calendar, TrendingUp, BarChart } from "@/components/admin/shared/icons";
import {
  revenueSummary,
  revenueTrend,
  bookingsTrend,
  topCitiesTrend,
  vendorPerformance,
} from "@/lib/admin/mockData";
import type { TrendPoint } from "@/lib/admin/types";

/** Max column height for the vertical bar charts, in px. */
const BAR_MAX_PX = 160;

/** Scale a value to a bar height in px against the series max (min 4px so an
 *  empty/tiny value still reads as a visible stub). */
function barHeight(value: number, max: number): string {
  if (max <= 0) return "4px";
  return `${Math.max(4, Math.round((value / max) * BAR_MAX_PX))}px`;
}

/** Vertical bar chart — one column per point, scaled to the series max. */
function ColumnChart({ data, barClassName }: { data: TrendPoint[]; barClassName: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="flex items-end gap-1.5 h-44">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <div
            className={`w-full rounded-t ${barClassName}`}
            style={{ height: barHeight(d.value, max) }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-ink-soft">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsView() {
  const bookingsTotal = useMemo(
    () => bookingsTrend.reduce((s, b) => s + b.value, 0),
    [],
  );

  const topCity = topCitiesTrend[0]?.label ?? "—";
  const cityMax = useMemo(
    () => Math.max(...topCitiesTrend.map((c) => c.value), 0),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Analytics"
        subtitle="Trends across revenue, bookings and cities."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Revenue (YTD)" value={money(revenueSummary.total)} />
        <StatCard icon={Calendar} label="Bookings (YTD)" value={String(bookingsTotal)} />
        <StatCard
          icon={TrendingUp}
          label="Avg Monthly Revenue"
          value={money(revenueSummary.total / 12)}
        />
        <StatCard icon={BarChart} label="Top City" value={topCity} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetCard
          title="Revenue Trend"
          action={<span className="text-xs text-ink-soft">₹ lakh</span>}
        >
          <ColumnChart data={revenueTrend} barClassName="bg-maroon" />
        </WidgetCard>

        <WidgetCard
          title="Bookings Trend"
          action={<span className="text-xs text-ink-soft">per month</span>}
        >
          <ColumnChart data={bookingsTrend} barClassName="bg-gold" />
        </WidgetCard>
      </div>

      <WidgetCard title="Top Cities">
        <ul className="space-y-3">
          {topCitiesTrend.map((c) => (
            <li key={c.label} className="flex items-center gap-3">
              <span className="w-28 text-sm text-ink">{c.label}</span>
              <span className="flex-1 h-3 rounded-full bg-cream-2">
                <span
                  className="block h-3 rounded-full bg-maroon"
                  style={{ width: `${cityMax > 0 ? (c.value / cityMax) * 100 : 0}%` }}
                />
              </span>
              <span className="w-10 text-right text-sm text-ink-soft">{c.value}</span>
            </li>
          ))}
        </ul>
      </WidgetCard>

      <WidgetCard title="Top Vendors">
        <ul className="divide-y divide-cream-3">
          {vendorPerformance.map((v) => (
            <li
              key={v.vendor}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 truncate text-sm font-medium text-ink">{v.vendor}</span>
              <span className="flex items-center gap-4 whitespace-nowrap">
                <span className="text-sm text-ink-soft">{v.bookings} bookings</span>
                <span className="font-display text-sm font-semibold text-ink">
                  {money(v.revenue)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
