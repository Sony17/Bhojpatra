"use client";

/**
 * Refund Management — refund requests against bookings and their lifecycle:
 * Requested → Approved → Processed (or Declined at either step). Distinct from
 * the Payments ledger, which only records the raw money movement a processed
 * refund eventually produces.
 */

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
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
import { Refund, Wallet, ShieldCheck } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import { adminRefunds, queryRefunds } from "@/lib/admin/mockData";
import type { AdminRefund, RefundStatus } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Requested", value: "Requested" },
  { label: "Approved", value: "Approved" },
  { label: "Processed", value: "Processed" },
  { label: "Declined", value: "Declined" },
];

export default function RefundManagement() {
  const [rows, setRows] = useState<AdminRefund[]>(adminRefunds);
  // Ids of rows persisted in the DB (fetched live) — only these get PATCHed;
  // the demo seed rows are updated locally so the console still works with no DB.
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Pull the real, persisted refund requests and surface them ahead of the demo
  // seed so genuine customer requests show up first. Same live-merge pattern the
  // booking console uses.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/refunds", { cache: "no-store" });
        if (!res.ok) return;
        const { refunds } = (await res.json()) as { refunds?: AdminRefund[] };
        if (cancelled || !Array.isArray(refunds) || refunds.length === 0) return;
        setLiveIds(new Set(refunds.map((r) => r.id)));
        setRows((prev) => {
          const ids = new Set(refunds.map((r) => r.id));
          return [...refunds, ...prev.filter((r) => !ids.has(r.id))];
        });
      } catch {
        // Network/parse failure — keep the seed rows.
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
    const open = rows.filter((r) => r.status === "Requested" || r.status === "Approved");
    const processed = rows.filter((r) => r.status === "Processed");
    return {
      open: open.length,
      pendingValue: open.reduce((s, r) => s + r.amount, 0),
      refunded: processed.reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  const result = useMemo(
    () => queryRefunds({ q, status: status as never, page, pageSize: PAGE_SIZE }, rows),
    [q, status, page, rows],
  );

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  // Optimistic status change. Live (persisted) rows are PATCHed and rolled back
  // if the server rejects the transition; demo seed rows update locally only.
  const setRefundStatus = (id: string, next: RefundStatus) => {
    const snapshot = rows;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: next,
              ...(next === "Processed" || next === "Declined"
                ? { processedAt: r.processedAt ?? r.requestedAt }
                : {}),
            }
          : r,
      ),
    );

    if (!liveIds.has(id)) return;

    fetch(`/api/refunds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("request failed"))))
      .then((data: { refund?: AdminRefund }) => {
        // Adopt the server's canonical row (it stamps the real processedAt).
        if (data?.refund) {
          setRows((prev) => prev.map((r) => (r.id === id ? data.refund! : r)));
        }
      })
      .catch(() => {
        setRows(snapshot);
        setToast("Couldn't save the refund. Please try again.");
      });
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const columns: Column<AdminRefund>[] = [
    {
      key: "id",
      header: "Refund",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.customer}</p>
          <p className="text-xs text-ink-soft">{r.id} · {r.bookingId}</p>
          <p className="truncate text-xs text-ink-soft">{r.reason}</p>
        </div>
      ),
    },
    { key: "method", header: "Method", cell: (r) => <span className="text-ink-soft">{r.method}</span> },
    { key: "requestedAt", header: "Requested", cell: (r) => <span className="text-ink-soft">{r.requestedAt}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => <span className="font-display font-semibold text-ink">{money(r.amount)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "Requested" && (
            <Button size="sm" variant="primary" onClick={stop(() => setRefundStatus(r.id, "Approved"))}>
              Approve
            </Button>
          )}
          {r.status === "Approved" && (
            <Button size="sm" variant="primary" onClick={stop(() => setRefundStatus(r.id, "Processed"))}>
              Process
            </Button>
          )}
          {(r.status === "Requested" || r.status === "Approved") && (
            <Button size="sm" variant="ghost" onClick={stop(() => setRefundStatus(r.id, "Declined"))}>
              Decline
            </Button>
          )}
          {(r.status === "Processed" || r.status === "Declined") && (
            <span className="text-xs text-ink-soft">{r.status}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Refunds"
        subtitle="Review, approve and process customer refund requests."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Refund} label="Open Requests" value={String(stats.open)} />
        <StatCard icon={ShieldCheck} label="Awaiting Payout" value={money(stats.pendingValue)} />
        <StatCard icon={Wallet} label="Total Refunded" value={money(stats.refunded)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by refund, booking or customer…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(r) => r.id}
        onRowClick={(r) => setSelectedId(r.id)}
        minWidthClass="min-w-[900px]"
        empty={<EmptyState title="No refunds found" message="Try a different search term or filters." />}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={setPage} />

      {toast && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          <span aria-hidden="true" className="text-maroon">✓</span>
          {toast}
        </p>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Refund ${selected.id}` : "Refund"}
        size="lg"
        footer={
          selected && (
            <>
              {selected.status === "Requested" && (
                <Button variant="primary" onClick={() => setRefundStatus(selected.id, "Approved")}>
                  Approve
                </Button>
              )}
              {selected.status === "Approved" && (
                <Button variant="primary" onClick={() => setRefundStatus(selected.id, "Processed")}>
                  Process Refund
                </Button>
              )}
              {(selected.status === "Requested" || selected.status === "Approved") && (
                <Button variant="secondary" onClick={() => setRefundStatus(selected.id, "Declined")}>
                  Decline
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Customer"><p className="text-sm text-ink">{selected.customer}</p></Field>
              <Field label="Booking"><p className="text-sm text-ink">{selected.bookingId}</p></Field>
              <Field label="Amount"><p className="font-display text-sm font-semibold text-maroon">{money(selected.amount)}</p></Field>
              <Field label="Method"><p className="text-sm text-ink">{selected.method}</p></Field>
              <Field label="Requested"><p className="text-sm text-ink">{selected.requestedAt}</p></Field>
              {selected.processedAt && (
                <Field label="Processed"><p className="text-sm text-ink">{selected.processedAt}</p></Field>
              )}
            </dl>

            <Field label="Reason">
              <p className="rounded-card bg-cream-2 p-3 text-sm text-ink">{selected.reason}</p>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
