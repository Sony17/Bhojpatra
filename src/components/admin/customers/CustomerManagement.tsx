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
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { Users, Calendar, Wallet } from "@/components/admin/shared/icons";
import BookingsMiniTable from "@/components/admin/bookings/BookingsMiniTable";
import type { AdminBooking, AdminCustomer } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Load customers (seeded server-side) and the real booking list — the latter
  // powers the per-customer booking history in the detail modal.
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/customers?pageSize=1000", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/bookings", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([cRes, bRes]) => {
      if (!active) return;
      if (cRes?.data) setCustomers(cRes.data as AdminCustomer[]);
      if (bRes?.orders) setBookings(bRes.orders as AdminBooking[]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const stats = useMemo(() => {
    const spend = customers.reduce((s, c) => s + c.lifetimeSpend, 0);
    return {
      total: customers.length,
      active: customers.filter((c) => c.status === "Active").length,
      bookings: customers.reduce((s, c) => s + c.totalBookings, 0),
      spend,
    };
  }, [customers]);

  // Filter + paginate client-side over the loaded list (same rules as the
  // former mock `queryCustomers`).
  const result = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = customers.filter((c) => {
      const matchesQ =
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.phone.toLowerCase().includes(needle);
      const matchesCity = city === "All" || c.city === city;
      const matchesStatus = status === "All" || c.status === status;
      return matchesQ && matchesCity && matchesStatus;
    });
    const start = (page - 1) * PAGE_SIZE;
    return {
      data: filtered.slice(start, start + PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: filtered.length,
    };
  }, [customers, q, city, status, page]);

  const selected = selectedId
    ? customers.find((c) => c.id === selectedId) ?? null
    : null;

  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(customers.map((c) => c.city))).sort();
    return [
      { label: "All Cities", value: "All" },
      ...cities.map((c) => ({ label: c, value: c })),
    ];
  }, [customers]);

  const columns: Column<AdminCustomer>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{c.name}</p>
          <p className="text-xs text-ink-soft">{c.email}</p>
        </div>
      ),
    },
    { key: "city", header: "City", cell: (c) => <span className="text-ink-soft">{c.city}</span> },
    { key: "bookings", header: "Bookings", cell: (c) => <span className="text-ink">{c.totalBookings}</span> },
    {
      key: "spend",
      header: "Lifetime Spend",
      cell: (c) => <span className="font-display font-semibold text-ink">{money(c.lifetimeSpend)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Customers" value={String(stats.total)} />
        <StatCard icon={Users} label="Active" value={String(stats.active)} />
        <StatCard icon={Calendar} label="Total Bookings" value={String(stats.bookings)} />
        <StatCard icon={Wallet} label="Lifetime Spend" value={money(stats.spend)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar value={q} onChange={onFilter(setQ)} placeholder="Search by name, email or phone…" className="lg:max-w-sm lg:flex-1" />
        <div className="flex flex-wrap gap-2.5">
          <SelectFilter label="City" value={city} options={cityOptions} onChange={onFilter(setCity)} />
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(c) => c.id}
        onRowClick={(c) => { setSelectedId(c.id); setNote(""); }}
        empty={
          <EmptyState
            title={loading ? "Loading customers…" : "No customers found"}
            message={
              loading
                ? "Fetching the customer list."
                : "Try a different search term or filters."
            }
          />
        }
      />

      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.name : "Customer"}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <SummaryStat label="Total Bookings" value={String(selected.totalBookings)} />
              <SummaryStat label="Active" value={String(selected.activeBookings)} />
              <SummaryStat label="Lifetime Spend" value={money(selected.lifetimeSpend)} />
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Email"><p className="text-sm text-ink">{selected.email}</p></Field>
              <Field label="Phone"><p className="text-sm text-ink">{selected.phone}</p></Field>
              <Field label="City"><p className="text-sm text-ink">{selected.city}</p></Field>
              <Field label="Joined"><p className="text-sm text-ink">{selected.joined}</p></Field>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Booking History
              </p>
              <BookingsMiniTable
                rows={bookings.filter((b) => b.customer === selected.name)}
                party="vendor"
                emptyMessage="This customer has no bookings yet."
              />
            </div>

            <Field label="Internal Note" hint="Visible to admins only (not persisted in this prototype).">
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this customer…"
                className={inputClass + " resize-y"}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-cream-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
