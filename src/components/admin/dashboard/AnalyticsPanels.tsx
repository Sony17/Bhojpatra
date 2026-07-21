"use client";

import { useMemo } from "react";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { money } from "@/components/admin/shared/money";
import { MONTHS_SHORT } from "@/lib/admin/bookingPeriods";
import type { AdminBookingRow } from "@/lib/admin/types";

/**
 * Analytics panels for the admin dashboard — trend charts derived entirely
 * from the live bookings the dashboard already fetched. Charts stay
 * dependency-free (plain divs sized by inline height/width, brand colours
 * only), matching the rest of the admin chrome.
 *
 * These panels deliberately ignore the dashboard's period filter: a monthly
 * trend only reads as a trend against the full history.
 */

/** A booking row paired with its parsed event date (null when unreadable). */
export interface DatedBooking {
  row: AdminBookingRow;
  date: Date | null;
}

/** How many trailing months of history the trend charts show. */
const MONTHS_SHOWN = 12;

/** How many entries the Top Cities / Top Vendors panels list. */
const TOP_N = 5;

/** Max column height for the vertical bar charts, in px. */
const BAR_MAX_PX = 160;

interface MonthBucket {
  /** Sortable month ordinal: year * 12 + month. */
  ordinal: number;
  label: string;
  bookings: number;
  revenue: number;
}

/** Scale a value to a bar height in px against the series max (min 4px so an
 *  empty/tiny value still reads as a visible stub). */
function barHeight(value: number, max: number): string {
  if (max <= 0) return "4px";
  return `${Math.max(4, Math.round((value / max) * BAR_MAX_PX))}px`;
}

/** Vertical bar chart — one column per point, scaled to the series max. */
function ColumnChart({
  data,
  barClassName,
  format = String,
}: {
  data: { label: string; value: number }[];
  barClassName: string;
  /** Tooltip formatter for the raw value (e.g. `money` for revenue). */
  format?: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="flex items-end gap-1.5 h-44">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <div
            className={`w-full rounded-t ${barClassName}`}
            style={{ height: barHeight(d.value, max) }}
            title={`${d.label}: ${format(d.value)}`}
          />
          <span className="text-[10px] text-ink-soft">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Shared "no data yet" body so every panel degrades identically. */
function NoData() {
  return <p className="py-6 text-center text-sm text-ink-soft">No bookings yet.</p>;
}

export default function AnalyticsPanels({ bookings }: { bookings: DatedBooking[] }) {
  // Trailing months that actually have bookings, oldest → newest. Year is
  // appended to labels only when the window spans more than one calendar year.
  const months = useMemo<MonthBucket[]>(() => {
    const byOrdinal = new Map<number, MonthBucket>();
    for (const { row, date } of bookings) {
      if (!date) continue;
      const ordinal = date.getFullYear() * 12 + date.getMonth();
      const bucket = byOrdinal.get(ordinal) ?? {
        ordinal,
        label: MONTHS_SHORT[date.getMonth()],
        bookings: 0,
        revenue: 0,
      };
      bucket.bookings += 1;
      bucket.revenue += row.amount;
      byOrdinal.set(ordinal, bucket);
    }
    const sorted = [...byOrdinal.values()]
      .sort((a, b) => a.ordinal - b.ordinal)
      .slice(-MONTHS_SHOWN);
    const years = new Set(sorted.map((m) => Math.floor(m.ordinal / 12)));
    if (years.size > 1) {
      for (const m of sorted) m.label = `${m.label} ${Math.floor(m.ordinal / 12) % 100}`;
    }
    return sorted;
  }, [bookings]);

  const topCities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { row } of bookings) {
      if (!row.city || row.city === "—") continue;
      counts.set(row.city, (counts.get(row.city) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_N);
  }, [bookings]);

  const topVendors = useMemo(() => {
    const byVendor = new Map<string, { vendor: string; bookings: number; revenue: number }>();
    for (const { row } of bookings) {
      const entry = byVendor.get(row.vendor) ?? { vendor: row.vendor, bookings: 0, revenue: 0 };
      entry.bookings += 1;
      entry.revenue += row.amount;
      byVendor.set(row.vendor, entry);
    }
    return [...byVendor.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_N);
  }, [bookings]);

  const cityMax = Math.max(...topCities.map((c) => c.value), 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetCard
          title="Revenue Trend"
          action={<span className="text-xs text-ink-soft">per month, all time</span>}
        >
          {months.length > 0 ? (
            <ColumnChart
              data={months.map((m) => ({ label: m.label, value: m.revenue }))}
              barClassName="bg-maroon"
              format={money}
            />
          ) : (
            <NoData />
          )}
        </WidgetCard>

        <WidgetCard
          title="Bookings Trend"
          action={<span className="text-xs text-ink-soft">per month, all time</span>}
        >
          {months.length > 0 ? (
            <ColumnChart
              data={months.map((m) => ({ label: m.label, value: m.bookings }))}
              barClassName="bg-gold"
            />
          ) : (
            <NoData />
          )}
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetCard title="Top Cities">
          {topCities.length > 0 ? (
            <ul className="space-y-3">
              {topCities.map((c) => (
                <li key={c.label} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm text-ink">{c.label}</span>
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
          ) : (
            <NoData />
          )}
        </WidgetCard>

        <WidgetCard title="Top Vendors">
          {topVendors.length > 0 ? (
            <ul className="divide-y divide-cream-3">
              {topVendors.map((v) => (
                <li
                  key={v.vendor}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-ink">
                    {v.vendor}
                  </span>
                  <span className="flex items-center gap-4 whitespace-nowrap">
                    <span className="text-sm text-ink-soft">{v.bookings} bookings</span>
                    <span className="font-display text-sm font-semibold text-ink">
                      {money(v.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <NoData />
          )}
        </WidgetCard>
      </div>
    </>
  );
}
