"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import { money } from "@/components/admin/shared/money";
import { Wallet } from "@/components/admin/shared/icons";
import {
  adminPayments,
  paymentsSummary,
  vendorSettlements as seedSettlements,
} from "@/lib/admin/mockData";
import type { AdminPayment, VendorSettlement } from "@/lib/admin/types";

const PAGE_SIZE = 8;

// A payment recorded by checkout via /api/payments.
interface LivePayment {
  id: string;
  bookingId: string;
  customer: string;
  method: "UPI" | "QR";
  type: "Advance";
  amount: number;
  status: "Advance Received";
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toAdminPayment(p: LivePayment): AdminPayment {
  return {
    id: p.id,
    bookingId: p.bookingId,
    customer: p.customer,
    method: p.method,
    type: p.type,
    amount: p.amount,
    status: p.status,
    date: formatDate(p.createdAt),
  };
}

const TABS: TabItem[] = [
  { id: "transactions", label: "Transactions" },
  { id: "settlements", label: "Vendor Settlements" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Settled", value: "Settled" },
  { label: "Advance Received", value: "Advance Received" },
  { label: "Pending", value: "Pending" },
  { label: "Refunded", value: "Refunded" },
];

const METHOD_OPTIONS = [
  { label: "All Methods", value: "All" },
  { label: "UPI", value: "UPI" },
  { label: "QR", value: "QR" },
  { label: "Card", value: "Card" },
];

export default function PaymentTracking() {
  const [tab, setTab] = useState("transactions");
  const [live, setLive] = useState<AdminPayment[]>([]);

  // Pull in advances collected through the live UPI checkout.
  useEffect(() => {
    let active = true;
    fetch("/api/payments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { payments?: LivePayment[] } | null) => {
        if (active && d?.payments) setLive(d.payments.map(toAdminPayment));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const liveCollected = live.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Payment Tracking"
        subtitle="Monitor collections, settlements and refunds."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Collected" value={money(paymentsSummary.collected + liveCollected)} />
        <StatCard icon={Wallet} label="Advance" value={money(paymentsSummary.advance + liveCollected)} />
        <StatCard icon={Wallet} label="Settled to Vendors" value={money(paymentsSummary.settled)} />
        <StatCard icon={Wallet} label="Pending" value={money(paymentsSummary.pending)} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "transactions" ? <TransactionsTab live={live} /> : <SettlementsTab />}
    </div>
  );
}

/* ── Transactions ─────────────────────────────────────────────────────────── */

function TransactionsTab({ live }: { live: AdminPayment[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [method, setMethod] = useState("All");
  const [page, setPage] = useState(1);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  // Live checkout payments shown ahead of the seeded history.
  const result = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = [...live, ...adminPayments].filter((p) => {
      const matchesQ =
        !needle ||
        p.id.toLowerCase().includes(needle) ||
        p.bookingId.toLowerCase().includes(needle) ||
        p.customer.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || p.status === status;
      const matchesMethod = method === "All" || p.method === method;
      return matchesQ && matchesStatus && matchesMethod;
    });
    const total = filtered.length;
    const start = (page - 1) * PAGE_SIZE;
    return { data: filtered.slice(start, start + PAGE_SIZE), page, pageSize: PAGE_SIZE, total };
  }, [q, status, method, page, live]);

  const columns: Column<AdminPayment>[] = [
    {
      key: "id",
      header: "Payment",
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{p.id}</p>
          <p className="text-xs text-ink-soft">{p.bookingId} · {p.customer}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (p) => <span className="text-ink-soft">{p.type}</span> },
    { key: "method", header: "Method", cell: (p) => <span className="text-ink-soft">{p.method}</span> },
    { key: "date", header: "Date", cell: (p) => <span className="text-ink-soft">{p.date}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (p) => <span className="font-display font-semibold text-ink">{money(p.amount)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar value={q} onChange={onFilter(setQ)} placeholder="Search by payment, booking or customer…" className="lg:max-w-sm lg:flex-1" />
        <div className="flex flex-wrap gap-2.5">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="Method" value={method} options={METHOD_OPTIONS} onChange={onFilter(setMethod)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(p) => p.id}
        empty={<EmptyState title="No payments found" message="Try a different search term or filters." />}
      />

      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
    </div>
  );
}

/* ── Settlements ──────────────────────────────────────────────────────────── */

function SettlementsTab() {
  const [rows, setRows] = useState<VendorSettlement[]>(seedSettlements);

  const settle = (id: string) =>
    setRows((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Settled" } : s)));

  const columns: Column<VendorSettlement>[] = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{s.vendor}</p>
          <p className="text-xs text-ink-soft">{s.period} · {s.bookings} bookings</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (s) => <span className="font-display font-semibold text-ink">{money(s.amount)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: "action",
      header: "",
      cell: (s) =>
        s.status === "Pending" ? (
          <button
            type="button"
            onClick={() => settle(s.id)}
            className="rounded-full bg-maroon px-4 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-maroon-dark"
          >
            Settle
          </button>
        ) : (
          <span className="text-xs text-ink-soft">—</span>
        ),
      className: "text-right",
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(s) => s.id}
      minWidthClass="min-w-[600px]"
      empty={<EmptyState title="No settlements" />}
    />
  );
}
