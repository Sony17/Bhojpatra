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
import { money } from "@/components/admin/shared/money";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { Button } from "@/components/ui";
import { Wallet } from "@/components/admin/shared/icons";
import { adminPayments, paymentsSummary } from "@/lib/admin/mockData";
import type { AdminPayment } from "@/lib/admin/types";

const PAGE_SIZE = 8;

// A payment recorded by checkout via /api/payments.
interface LivePayment {
  id: string;
  bookingId: string;
  customer: string;
  method: "UPI" | "QR" | "Razorpay";
  type: "Advance";
  amount: number;
  status: AdminPayment["status"];
  createdAt: string;
  customerTxnId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
  refundedAmount?: number;
}

/** A failed gateway attempt moved no money — keep it out of every total. */
const countsAsCollected = (p: AdminPayment) => p.status !== "Failed";

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
    ref: p.customerTxnId,
    orderRef: p.razorpayOrderId,
    failureReason: p.failureReason,
    refundedAmount: p.refundedAmount,
    createdAt: p.createdAt,
  };
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Settled", value: "Settled" },
  { label: "Advance Received", value: "Advance Received" },
  { label: "Pending", value: "Pending" },
  { label: "Refunded", value: "Refunded" },
  { label: "Failed", value: "Failed" },
];

const METHOD_OPTIONS = [
  { label: "All Methods", value: "All" },
  { label: "Razorpay", value: "Razorpay" },
  { label: "UPI", value: "UPI" },
  { label: "QR", value: "QR" },
  { label: "Card", value: "Card" },
];

export default function PaymentTracking() {
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

  const liveCollected = live
    .filter(countsAsCollected)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Payment Tracking"
        subtitle="Monitor customer advance collections."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard icon={Wallet} label="Collected" value={money(paymentsSummary.collected + liveCollected)} />
        <StatCard icon={Wallet} label="Advance" value={money(paymentsSummary.advance + liveCollected)} />
      </div>

      <TransactionsTab live={live} />
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

  // One predicate for both the table and the CSV export.
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (p: AdminPayment) => {
      const matchesQ =
        !needle ||
        p.id.toLowerCase().includes(needle) ||
        p.bookingId.toLowerCase().includes(needle) ||
        p.customer.toLowerCase().includes(needle) ||
        (p.ref?.toLowerCase().includes(needle) ?? false) ||
        (p.orderRef?.toLowerCase().includes(needle) ?? false);
      const matchesStatus = status === "All" || p.status === status;
      const matchesMethod = method === "All" || p.method === method;
      return matchesQ && matchesStatus && matchesMethod;
    };
  }, [q, status, method]);

  // Real recorded transactions matching the current filters — what the CSV
  // exports. The demo seed rows are display-only and never exported.
  const liveFiltered = useMemo(() => live.filter(matches), [live, matches]);

  // Live checkout payments shown ahead of the seeded history.
  const result = useMemo(() => {
    const filtered = [...liveFiltered, ...adminPayments.filter(matches)];
    const total = filtered.length;
    const start = (page - 1) * PAGE_SIZE;
    return { data: filtered.slice(start, start + PAGE_SIZE), page, pageSize: PAGE_SIZE, total };
  }, [liveFiltered, matches, page]);

  const handleExport = () => {
    exportCsv(
      `bhojpatra-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      liveFiltered.map((p) => ({
        "Payment ID": p.id,
        "Booking ID": p.bookingId,
        Customer: p.customer,
        Method: p.method,
        Type: p.type,
        "Amount (INR)": p.amount,
        Status: p.status,
        "Refunded (INR)": p.refundedAmount ?? (p.status === "Refunded" ? p.amount : 0),
        "Payment Ref": p.ref ?? "",
        "Razorpay Order": p.orderRef ?? "",
        "Failure Reason": p.failureReason ?? "",
        Date: p.date,
        Timestamp: p.createdAt ?? "",
      })),
    );
  };

  const columns: Column<AdminPayment>[] = [
    {
      key: "id",
      header: "Payment",
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{p.id}</p>
          <p className="text-xs text-ink-soft">{p.bookingId} · {p.customer}</p>
          {p.ref && (
            <p className="truncate text-xs text-ink-soft">Txn ID: {p.ref}</p>
          )}
          {p.failureReason && (
            <p className="truncate text-xs text-maroon">{p.failureReason}</p>
          )}
          {p.refundedAmount !== undefined && p.refundedAmount < p.amount && (
            <p className="text-xs text-ink-soft">Partly refunded: {money(p.refundedAmount)}</p>
          )}
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
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="Method" value={method} options={METHOD_OPTIONS} onChange={onFilter(setMethod)} />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleExport}
          disabled={liveFiltered.length === 0}
          className="lg:ml-auto"
        >
          Export CSV
        </Button>
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
