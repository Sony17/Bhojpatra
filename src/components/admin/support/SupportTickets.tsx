"use client";

/**
 * Support Tickets — post-booking customer support requests and their lifecycle:
 * Open → In Progress → Resolved. Distinct from Enquiries (pre-sale Contact-form
 * messages): a ticket has a priority and is usually tied to a booking.
 */

import { useMemo, useState } from "react";
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
import { LifeBuoy, TrendingUp, ShieldCheck } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import { supportTickets, querySupport } from "@/lib/admin/mockData";
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

export default function SupportTickets() {
  const [rows, setRows] = useState<SupportTicket[]>(supportTickets);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const stats = useMemo(
    () => ({
      open: rows.filter((t) => t.status === "Open").length,
      inProgress: rows.filter((t) => t.status === "In Progress").length,
      resolved: rows.filter((t) => t.status === "Resolved").length,
    }),
    [rows],
  );

  const result = useMemo(
    () =>
      querySupport(
        { q, status: status as never, priority: priority as never, page, pageSize: PAGE_SIZE },
        rows,
      ),
    [q, status, priority, page, rows],
  );

  const selected = selectedId ? rows.find((t) => t.id === selectedId) ?? null : null;

  const setTicketStatus = (id: string, next: SupportTicketStatus) =>
    setRows((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));

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
    { key: "updatedAt", header: "Updated", cell: (t) => <span className="text-ink-soft">{t.updatedAt}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Support Tickets"
        subtitle="Track and resolve customer support requests."
      />

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
        rows={result.data}
        getRowKey={(t) => t.id}
        onRowClick={(t) => setSelectedId(t.id)}
        minWidthClass="min-w-[820px]"
        empty={<EmptyState title="No tickets found" message="Try a different search term or filters." />}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={setPage} />

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Ticket ${selected.id}` : "Ticket"}
        size="lg"
        footer={
          selected && (
            <>
              {selected.status === "Open" && (
                <Button variant="primary" onClick={() => setTicketStatus(selected.id, "In Progress")}>
                  Start Progress
                </Button>
              )}
              {selected.status === "In Progress" && (
                <Button variant="primary" onClick={() => setTicketStatus(selected.id, "Resolved")}>
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
              <Field label="Created"><p className="text-sm text-ink">{selected.createdAt}</p></Field>
              <Field label="Updated"><p className="text-sm text-ink">{selected.updatedAt}</p></Field>
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
