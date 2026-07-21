"use client";

/**
 * Settlement Tracking — vendor payouts. Each row is a period's worth of a
 * vendor's completed bookings that Bhojpatra owes out. Distinct from Payments
 * (money coming IN from customers): this is money going OUT to vendors. Admins
 * mark a pending settlement as settled once the payout is released.
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
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { money } from "@/components/admin/shared/money";
import { Banknote, Wallet, Store } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import { vendorSettlements } from "@/lib/admin/mockData";
import type { VendorSettlement } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Settled", value: "Settled" },
];

export default function SettlementTracking() {
  const [rows, setRows] = useState<VendorSettlement[]>(vendorSettlements);
  // Ids of rows derived from real bookings (fetched live) — only these get
  // PATCHed; the demo seed rows are updated locally so the console still works
  // with no DB.
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  // Pull the real settlement rows (derived server-side from completed bookings)
  // and surface them ahead of the demo seed. Same live-merge pattern the refund
  // console uses.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settlements", { cache: "no-store" });
        if (!res.ok) return;
        const { settlements } = (await res.json()) as {
          settlements?: VendorSettlement[];
        };
        if (cancelled || !Array.isArray(settlements) || settlements.length === 0) return;
        setLiveIds(new Set(settlements.map((s) => s.id)));
        setRows((prev) => {
          const ids = new Set(settlements.map((s) => s.id));
          return [...settlements, ...prev.filter((r) => !ids.has(r.id))];
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
    const pending = rows.filter((r) => r.status === "Pending");
    const settled = rows.filter((r) => r.status === "Settled");
    return {
      due: pending.reduce((s, r) => s + r.amount, 0),
      settled: settled.reduce((s, r) => s + r.amount, 0),
      vendors: new Set(rows.map((r) => r.vendor)).size,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !needle ||
        r.id.toLowerCase().includes(needle) ||
        r.vendor.toLowerCase().includes(needle) ||
        r.period.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || r.status === status;
      return matchesQ && matchesStatus;
    });
  }, [rows, q, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Optimistic settle. Live (derived-from-bookings) rows are PATCHed and rolled
  // back if the server rejects it; demo seed rows update locally only.
  const markSettled = (id: string) => {
    const snapshot = rows;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Settled" } : r)));

    if (!liveIds.has(id)) return;

    fetch(`/api/settlements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Settled" }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("request failed"))))
      .then((data: { settlement?: VendorSettlement }) => {
        // Adopt the server's canonical row.
        if (data?.settlement) {
          setRows((prev) => prev.map((r) => (r.id === id ? data.settlement! : r)));
        }
      })
      .catch(() => {
        setRows(snapshot);
        setToast("Couldn't save the settlement. Please try again.");
      });
  };

  const handleExport = () =>
    exportCsv(
      "bhojpatra-settlements.csv",
      filtered.map((r) => ({
        Settlement: r.id,
        Vendor: r.vendor,
        Period: r.period,
        Bookings: r.bookings,
        Amount: r.amount,
        Status: r.status,
      })),
    );

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const columns: Column<VendorSettlement>[] = [
    {
      key: "id",
      header: "Settlement",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.vendor}</p>
          <p className="text-xs text-ink-soft">{r.id} · {r.period}</p>
        </div>
      ),
    },
    { key: "bookings", header: "Bookings", cell: (r) => <span className="text-ink-soft">{r.bookings}</span> },
    {
      key: "amount",
      header: "Payout",
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
      cell: (r) =>
        r.status === "Pending" ? (
          <Button size="sm" variant="primary" onClick={stop(() => markSettled(r.id))}>
            Mark Settled
          </Button>
        ) : (
          <span className="text-xs text-ink-soft">Paid out</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Settlements"
        subtitle="Vendor payouts for completed bookings, period by period."
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Banknote} label="Due to Vendors" value={money(stats.due)} />
        <StatCard icon={Wallet} label="Settled" value={money(stats.settled)} />
        <StatCard icon={Store} label="Vendors" value={String(stats.vendors)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by vendor, period or ID…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(r) => r.id}
        empty={<EmptyState title="No settlements found" message="Try a different search term or filters." />}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      {toast && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          <span aria-hidden="true" className="text-maroon">✓</span>
          {toast}
        </p>
      )}
    </div>
  );
}
