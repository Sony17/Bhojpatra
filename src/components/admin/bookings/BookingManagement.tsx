"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Field } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { Calendar, ShieldCheck, Wallet } from "@/components/admin/shared/icons";
import { adminBookings, bookingCities, queryBookings } from "@/lib/admin/mockData";
import { servingTimeLabel } from "@/lib/data";
import type { AdminBooking, BookingStatus } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Confirmed", value: "Confirmed" },
  { label: "Pending", value: "Pending" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const STATUS_SET: BookingStatus[] = ["Pending", "Confirmed", "Completed", "Cancelled"];

/** Map a persisted order (from `GET /api/bookings`) to the admin row shape. */
function toAdminBooking(o: Record<string, unknown>): AdminBooking {
  return {
    id: String(o.id),
    customer: typeof o.customer === "string" ? o.customer : "Online Booking",
    ...(typeof o.phone === "string" && o.phone ? { phone: o.phone } : {}),
    ...(typeof o.email === "string" && o.email ? { email: o.email } : {}),
    occasion: typeof o.occasion === "string" ? o.occasion : "Feast",
    date: typeof o.date === "string" ? o.date : "",
    ...(typeof o.mealTime === "string" && o.mealTime ? { mealTime: o.mealTime } : {}),
    ...(typeof o.eventTime === "string" && o.eventTime ? { eventTime: o.eventTime } : {}),
    guests: Number(o.guests) || 0,
    vendor: typeof o.vendor === "string" ? o.vendor : "Bhojpatra",
    city: typeof o.city === "string" ? o.city : "—",
    ...(typeof o.venue === "string" && o.venue ? { venue: o.venue } : {}),
    amount: Number(o.amount) || 0,
    paid: Number(o.paid) || 0,
    status: (o.status as AdminBooking["status"]) ?? "Confirmed",
    ...(typeof o.paymentRef === "string" ? { paymentRef: o.paymentRef } : {}),
    ...(typeof o.referralCode === "string" ? { referralCode: o.referralCode } : {}),
    ...(typeof o.referrerName === "string" ? { referrerName: o.referrerName } : {}),
    ...(typeof o.referrerType === "string" ? { referrerType: o.referrerType } : {}),
  };
}

export default function BookingManagement() {
  const [rows, setRows] = useState<AdminBooking[]>(adminBookings);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [city, setCity] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pull the real, persisted bookings from the API and surface them ahead of the
  // demo rows so genuine customer bookings show up in the console. Local status
  // edits stay intact because we only prepend orders the list doesn't already have.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bookings", { cache: "no-store" });
        if (!res.ok) return;
        const { orders } = (await res.json()) as { orders?: Record<string, unknown>[] };
        if (cancelled || !Array.isArray(orders) || orders.length === 0) return;
        const live = orders.map(toAdminBooking);
        setRows((prev) => {
          const liveIds = new Set(live.map((b) => b.id));
          return [...live, ...prev.filter((b) => !liveIds.has(b.id))];
        });
      } catch {
        // Network/parse failure — keep the existing rows.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const stats = useMemo(() => {
    const revenue = rows.reduce((s, b) => s + b.amount, 0);
    return {
      total: rows.length,
      confirmed: rows.filter((b) => b.status === "Confirmed").length,
      pending: rows.filter((b) => b.status === "Pending").length,
      revenue,
    };
  }, [rows]);

  // Reuse the shared selector against live rows so locally-updated statuses are
  // respected (no duplicated filter logic).
  const result = useMemo(
    () => queryBookings({ q, status: status as never, city: city as never, page, pageSize: PAGE_SIZE }, rows),
    [q, status, city, page, rows],
  );

  const selected = selectedId ? rows.find((b) => b.id === selectedId) ?? null : null;

  const setBookingStatus = (id: string, next: BookingStatus) =>
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status: next } : b)));

  const cityOptions = useMemo(
    () => [{ label: "All Cities", value: "All" }, ...bookingCities.map((c) => ({ label: c, value: c }))],
    [],
  );

  const columns: Column<AdminBooking>[] = [
    {
      key: "id",
      header: "Booking",
      cell: (b) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{b.customer}</p>
            {b.referralCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-cream">
                <span aria-hidden="true">★</span>
                {b.referrerName ? `Ref: ${b.referrerName}` : "Referral"}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-soft">{b.occasion} · {b.id}</p>
        </div>
      ),
    },
    { key: "vendor", header: "Vendor", cell: (b) => <span className="text-ink-soft">{b.vendor}</span> },
    { key: "date", header: "Date", cell: (b) => <span className="text-ink-soft">{b.date}</span> },
    { key: "guests", header: "Guests", cell: (b) => <span className="text-ink-soft">{b.guests}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (b) => <span className="font-display font-semibold text-ink">{money(b.amount)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Calendar} label="Total Bookings" value={String(stats.total)} />
        <StatCard icon={ShieldCheck} label="Confirmed" value={String(stats.confirmed)} />
        <StatCard icon={Calendar} label="Pending" value={String(stats.pending)} />
        <StatCard icon={Wallet} label="Gross Value" value={money(stats.revenue)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar value={q} onChange={onFilter(setQ)} placeholder="Search by customer, vendor or ID…" className="lg:max-w-sm lg:flex-1" />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="City" value={city} options={cityOptions} onChange={onFilter(setCity)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(b) => b.id}
        onRowClick={(b) => setSelectedId(b.id)}
        empty={<EmptyState title="No bookings found" message="Try a different search term or filters." />}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={setPage} />

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Booking ${selected.id}` : "Booking"}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Customer"><p className="text-sm text-ink">{selected.customer}</p></Field>
              {selected.phone && (
                <Field label="Phone"><p className="text-sm text-ink">{selected.phone}</p></Field>
              )}
              {selected.email && (
                <Field label="Email"><p className="text-sm break-all text-ink">{selected.email}</p></Field>
              )}
              <Field label="Vendor"><p className="text-sm text-ink">{selected.vendor}</p></Field>
              <Field label="Occasion"><p className="text-sm text-ink">{selected.occasion}</p></Field>
              <Field label="Date"><p className="text-sm text-ink">{selected.date}</p></Field>
              {servingTimeLabel(selected.mealTime, selected.eventTime) && (
                <Field label="Serving"><p className="text-sm text-ink">{servingTimeLabel(selected.mealTime, selected.eventTime)}</p></Field>
              )}
              <Field label="Guests"><p className="text-sm text-ink">{selected.guests}</p></Field>
              <Field label="City"><p className="text-sm text-ink">{selected.city}</p></Field>
              {selected.venue && (
                <Field label="Venue"><p className="text-sm text-ink">{selected.venue}</p></Field>
              )}
              <Field label="Amount"><p className="font-display text-sm font-semibold text-ink">{money(selected.amount)}</p></Field>
              <Field label="Balance Due"><p className="font-display text-sm font-semibold text-maroon">{money(selected.amount - selected.paid)}</p></Field>
              {selected.paymentRef && (
                <Field label="Transaction Ref">
                  <p className="text-sm tracking-wide text-ink">{selected.paymentRef}</p>
                </Field>
              )}
              {selected.referralCode && (
                <Field label="Referred By">
                  <p className="text-sm text-ink">
                    {selected.referrerName || "—"}{" "}
                    <span className="text-ink-soft">({selected.referralCode})</span>
                  </p>
                </Field>
              )}
            </dl>

            <div className="rounded-card bg-cream-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Paid</span>
                <span className="font-medium text-ink">{money(selected.paid)} / {money(selected.amount)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-3">
                <div className="h-full rounded-full bg-maroon" style={{ width: `${Math.round((selected.paid / selected.amount) * 100)}%` }} />
              </div>
            </div>

            <div className="max-w-xs">
              <Field label="Update Status">
                <SelectFilter
                  label="Update Status"
                  value={selected.status}
                  options={STATUS_SET.map((s) => ({ label: s, value: s }))}
                  onChange={(v) => setBookingStatus(selected.id, v as BookingStatus)}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
