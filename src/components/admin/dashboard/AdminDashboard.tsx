"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import PeriodPicker from "@/components/admin/shared/PeriodPicker";
import { Calendar, ShieldCheck, Wallet } from "@/components/admin/shared/icons";
import { money } from "@/components/admin/shared/money";
import {
  computeTrend,
  defaultPeriod,
  inPeriod,
  parseEventDate,
  periodLabel,
  previousPeriod,
  trendCaption,
  type Period,
} from "@/lib/admin/bookingPeriods";
import RecentBookingsTable from "./RecentBookingsTable";
import PendingApprovalsPanel from "./PendingApprovalsPanel";
import AnalyticsPanels from "./AnalyticsPanels";
import type {
  AdminBookingRow,
  BookingStatus,
  PendingVendorApproval,
  VendorApplication,
} from "@/lib/admin/types";

/** Map a persisted order (from `GET /api/bookings`) to the dashboard row shape. */
function toBookingRow(o: Record<string, unknown>): AdminBookingRow {
  return {
    id: String(o.id),
    customer: typeof o.customer === "string" ? o.customer : "Online Booking",
    ...(typeof o.phone === "string" && o.phone ? { phone: o.phone } : {}),
    ...(typeof o.email === "string" && o.email ? { email: o.email } : {}),
    occasion: typeof o.occasion === "string" ? o.occasion : "Feast",
    date: typeof o.date === "string" ? o.date : "",
    vendor: typeof o.vendor === "string" ? o.vendor : "Bhojpatra",
    city: typeof o.city === "string" ? o.city : "—",
    amount: Number(o.amount) || 0,
    status: (o.status as BookingStatus) ?? "Confirmed",
  };
}

/**
 * Admin dashboard (landing). Reads only real, persisted data: recent bookings
 * from `/api/bookings`, pending vendor applications from
 * `/api/vendors/applications`, and collected advances from `/api/payments`.
 * Every figure — including the analytics trend charts at the bottom — is
 * derived from this live data; nothing is fabricated, and the panels link
 * through to the full consoles.
 */
export default function AdminDashboard() {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [pending, setPending] = useState<PendingVendorApproval[]>([]);
  const [collected, setCollected] = useState(0);
  // Stable "now" for the period presets/default (avoids re-computing per render).
  const [today] = useState(() => new Date());
  // Selected reporting window. Null until bookings load, then defaulted to a
  // month that actually has data so the dashboard opens populated.
  const [period, setPeriod] = useState<Period | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [bRes, aRes, pRes] = await Promise.all([
          fetch("/api/bookings", { cache: "no-store" }),
          fetch("/api/vendors/applications", { cache: "no-store" }),
          fetch("/api/payments", { cache: "no-store" }),
        ]);
        if (bRes.ok) {
          const { orders } = (await bRes.json()) as {
            orders?: Record<string, unknown>[];
          };
          if (active && Array.isArray(orders)) {
            const rows = orders.map(toBookingRow);
            setBookings(rows);
            const dates = rows
              .map((r) => parseEventDate(r.date))
              .filter((d): d is Date => d !== null);
            setPeriod((prev) => prev ?? defaultPeriod(dates, today));
          }
        }
        if (aRes.ok) {
          const { applications } = (await aRes.json()) as {
            applications?: VendorApplication[];
          };
          if (active && Array.isArray(applications))
            setPending(applications.filter((a) => a.status === "Pending"));
        }
        if (pRes.ok) {
          const { payments } = (await pRes.json()) as {
            payments?: { amount?: number }[];
          };
          if (active && Array.isArray(payments))
            setCollected(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
        }
      } catch {
        // Network/parse failure — the empty states below stand in.
      }
    })();
    return () => {
      active = false;
    };
  }, [today]);

  // Each booking paired with its parsed event date (null when unreadable).
  const dated = useMemo(
    () => bookings.map((b) => ({ row: b, date: parseEventDate(b.date) })),
    [bookings],
  );

  const effectivePeriod: Period = useMemo(
    () => period ?? { kind: "all" },
    [period],
  );

  // Bookings inside the selected window. "All time" keeps everything (including
  // rows whose event date couldn't be parsed); dated windows require a real date.
  const periodBookings = useMemo(() => {
    if (effectivePeriod.kind === "all") return bookings;
    return dated
      .filter((x) => x.date && inPeriod(x.date, effectivePeriod))
      .map((x) => x.row);
  }, [bookings, dated, effectivePeriod]);

  // Month-over-month (or period-over-period) delta for the Total Bookings card.
  const bookingsTrend = useMemo(() => {
    if (effectivePeriod.kind === "all") return undefined;
    const prev = previousPeriod(effectivePeriod);
    if (!prev) return undefined;
    const prevCount = dated.filter(
      (x) => x.date && inPeriod(x.date, prev),
    ).length;
    return (
      computeTrend(
        periodBookings.length,
        prevCount,
        trendCaption(effectivePeriod),
      ) ?? undefined
    );
  }, [dated, effectivePeriod, periodBookings.length]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Panel"
        title="Dashboard"
        subtitle="Your marketplace at a glance."
      />

      {/* Reporting window — filters Total Bookings + Recent Bookings below. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Showing{" "}
          <span className="font-semibold text-ink">
            {periodLabel(effectivePeriod)}
          </span>
        </p>
        <PeriodPicker value={effectivePeriod} onChange={setPeriod} today={today} />
      </div>

      {/* Live headline figures */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={String(periodBookings.length)}
          trend={bookingsTrend}
          sub={
            effectivePeriod.kind === "all"
              ? "All time"
              : periodLabel(effectivePeriod)
          }
        />
        <StatCard
          icon={ShieldCheck}
          label="Pending Vendor Approvals"
          value={String(pending.length)}
        />
        <StatCard icon={Wallet} label="Advance Collected" value={money(collected)} />
      </div>

      <RecentBookingsTable
        rows={periodBookings.slice(0, 6)}
        seeAllHref="/admin/customers?tab=bookings"
      />

      <PendingApprovalsPanel
        approvals={pending.slice(0, 5)}
        seeAllHref="/admin/vendor-approvals"
      />

      {/* Trend charts over the full booking history — the period filter above
          doesn't apply here (a one-month window can't show a trend). */}
      <AnalyticsPanels bookings={dated} />
    </div>
  );
}
