"use client";

/**
 * Support Tickets — post-booking customer support requests and their lifecycle:
 * Open → In Progress → Resolved. Distinct from Enquiries (pre-sale Contact-form
 * messages): a ticket has a priority and is usually tied to a booking.
 *
 * Tickets are raised by customers from My Bookings ("Get help" on an order) and
 * read back here via GET /api/support; the footer actions persist status moves
 * through PATCH /api/support.
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
import LoadingSkeleton from "@/components/admin/shared/LoadingSkeleton";
import Modal from "@/components/admin/shared/Modal";
import { Field } from "@/components/admin/shared/FormControls";
import { LifeBuoy, TrendingUp, ShieldCheck } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import type { SupportTicket, SupportTicketStatus } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Open", value: "Open" },
  { label: "In Progress", value: "In Progress" },
  { label: "Resolved", value: "Resolved" },
];

const PRIORITY_OPTIONS = [
  { label: "All Priorities", value: "All" },
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportTickets() {
  const [rows, setRows] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/support", { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as { tickets?: SupportTicket[] };
        if (active) setRows(data.tickets ?? []);
      } catch {
        if (active) {
          setError(true);
          setRows([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const all = useMemo(() => rows ?? [], [rows]);

  const stats = useMemo(
    () => ({
      open: all.filter((t) => t.status === "Open").length,
      inProgress: all.filter((t) => t.status === "In Progress").length,
      resolved: all.filter((t) => t.status === "Resolved").length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((t) => {
      const matchesQ =
        !needle ||
        t.id.toLowerCase().includes(needle) ||
        t.subject.toLowerCase().includes(needle) ||
        t.customer.toLowerCase().includes(needle) ||
        (t.bookingId?.toLowerCase().includes(needle) ?? false);
      const matchesStatus = status === "All" || t.status === status;
      const matchesPriority = priority === "All" || t.priority === priority;
      return matchesQ && matchesStatus && matchesPriority;
    });
  }, [all, q, status, priority]);

  const total = filtered.length;
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const selected = selectedId
    ? all.find((t) => t.id === selectedId) ?? null
    : null;

  // Persist a lifecycle move, then reconcile with the server's copy (it stamps
  // `updatedAt`). Errors keep the modal open so the admin can just retry.
  const setTicketStatus = async (id: string, next: SupportTicketStatus) => {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { ticket?: SupportTicket };
      const ticket = data.ticket;
      if (ticket) {
        setRows((prev) =>
          (prev ?? []).map((t) => (t.id === ticket.id ? ticket : t)),
        );
      }
    } catch {
      // Leave the row as-is; the button stays available for a retry.
    } finally {
      setStatusBusy(false);
    }
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: "subject",
      header: "Ticket",
      cell: (t) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{t.subject}</p>
          <p className="text-xs text-ink-soft">
            {t.customer} · {t.id}
            {t.bookingId ? ` · ${t.bookingId}` : ""}
          </p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (t) => <span className="text-ink-soft">{t.category}</span> },
    { key: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { key: "updatedAt", header: "Updated", cell: (t) => <span className="text-ink-soft">{formatDateTime(t.updatedAt)}</span> },
  ];

  if (rows === null) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Support Tickets"
        subtitle="Help requests raised from My Bookings — track and resolve them here."
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-maroon/30 bg-cream-2 px-4 py-3 text-sm text-maroon"
        >
          Couldn&apos;t load support tickets. Please refresh the page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={LifeBuoy} label="Open" value={String(stats.open)} />
        <StatCard icon={TrendingUp} label="In Progress" value={String(stats.inProgress)} />
        <StatCard icon={ShieldCheck} label="Resolved" value={String(stats.resolved)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by subject, customer or booking…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={onFilter(setPriority)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(t) => t.id}
        onRowClick={(t) => setSelectedId(t.id)}
        minWidthClass="min-w-[820px]"
        empty={
          <EmptyState
            title={q || status !== "All" || priority !== "All" ? "No tickets found" : "No tickets yet"}
            message={
              q || status !== "All" || priority !== "All"
                ? "Try a different search term or filters."
                : "Tickets will appear here as customers use “Get help” in My Bookings."
            }
          />
        }
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Ticket ${selected.id}` : "Ticket"}
        size="lg"
        footer={
          selected && (
            <>
              {selected.status === "Open" && (
                <Button
                  variant="primary"
                  loading={statusBusy}
                  onClick={() => setTicketStatus(selected.id, "In Progress")}
                >
                  Start Progress
                </Button>
              )}
              {selected.status === "In Progress" && (
                <Button
                  variant="primary"
                  loading={statusBusy}
                  onClick={() => setTicketStatus(selected.id, "Resolved")}
                >
                  Mark Resolved
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
              <StatusBadge status={selected.priority} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <p className="font-display text-lg text-ink">{selected.subject}</p>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Customer"><p className="text-sm text-ink">{selected.customer}</p></Field>
              <Field label="Email"><p className="text-sm break-all text-ink">{selected.email}</p></Field>
              <Field label="Category"><p className="text-sm text-ink">{selected.category}</p></Field>
              <Field label="Priority"><p className="text-sm text-ink">{selected.priority}</p></Field>
              {selected.bookingId && (
                <Field label="Booking"><p className="text-sm text-ink">{selected.bookingId}</p></Field>
              )}
              <Field label="Created"><p className="text-sm text-ink">{formatDateTime(selected.createdAt)}</p></Field>
              <Field label="Updated"><p className="text-sm text-ink">{formatDateTime(selected.updatedAt)}</p></Field>
            </dl>

            <Field label="Message">
              <p className="rounded-card bg-cream-2 p-3 text-sm text-ink">{selected.message}</p>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
