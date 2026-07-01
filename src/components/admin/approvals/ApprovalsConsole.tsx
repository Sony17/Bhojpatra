"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import TierBadges from "@/components/admin/shared/TierBadges";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Calendar, ShieldCheck, Close } from "@/components/admin/shared/icons";
import { queryApprovals } from "@/lib/admin/mockData";
import type {
  VendorApplication,
  VerificationStatus,
} from "@/lib/admin/types";

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Verified", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
];

/**
 * Vendor Approvals / KYC console. Holds the application list in local state for
 * mock approve/reject + per-document review, reusing the shared table/dialog kit
 * and the `queryApprovals` selector (passed the local list so filtering logic
 * isn't duplicated). API-swappable: replace the selector body + local mutations
 * with calls.
 */
export default function ApprovalsConsole() {
  const [apps, setApps] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load submitted applications from the file-backed store on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/vendors/applications", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { applications?: VendorApplication[] }) => {
        if (active) setApps(data.applications ?? []);
      })
      .catch(() => {
        if (active) setToast("Couldn't load applications. Please refresh.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const counts = useMemo(
    () => ({
      pending: apps.filter((a) => a.status === "Pending").length,
      verified: apps.filter((a) => a.status === "Verified").length,
      rejected: apps.filter((a) => a.status === "Rejected").length,
    }),
    [apps],
  );

  const result = useMemo(
    () => queryApprovals({ q, status: status as never, page, pageSize: PAGE_SIZE }, apps),
    [q, status, page, apps],
  );

  const selected = selectedId
    ? apps.find((a) => a.id === selectedId) ?? null
    : null;

  // Persist a review decision, applying it optimistically and rolling back if
  // the request fails so the UI never drifts from the store.
  const persist = async (id: string, body: object, snapshot: VendorApplication[]) => {
    try {
      const res = await fetch(`/api/vendors/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setApps(snapshot);
      setToast("Couldn't save. Please try again.");
    }
  };

  const setAppStatus = (id: string, next: VerificationStatus) => {
    const snapshot = apps;
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: next,
              documents:
                next === "Verified"
                  ? a.documents.map((d) => ({ ...d, status: "Verified" as const }))
                  : a.documents,
            }
          : a,
      ),
    );
    setToast(`Application ${next === "Verified" ? "approved" : "rejected"}`);
    void persist(id, { status: next }, snapshot);
  };

  const setDocStatus = (
    id: string,
    kind: string,
    next: VerificationStatus,
  ) => {
    const snapshot = apps;
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              documents: a.documents.map((d) =>
                d.kind === kind ? { ...d, status: next } : d,
              ),
            }
          : a,
      ),
    );
    void persist(id, { document: { kind, status: next } }, snapshot);
  };

  const columns: Column<VendorApplication>[] = [
    {
      key: "applicant",
      header: "Applicant",
      cell: (a) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{a.business}</p>
          <p className="text-xs text-ink-soft">
            {a.owner} · {a.speciality}
          </p>
        </div>
      ),
    },
    { key: "city", header: "City", cell: (a) => <span className="text-ink-soft">{a.city}</span> },
    { key: "tier", header: "Requested", cell: (a) => <TierBadges tiers={a.requestedTiers} /> },
    { key: "submitted", header: "Submitted", cell: (a) => <span className="text-ink-soft">{a.submitted}</span> },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
    {
      key: "action",
      header: "",
      cell: () => <span className="text-sm font-semibold text-maroon">Review</span>,
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Vendor Approvals & KYC"
        subtitle="Review applications, verify documents and approve new vendors."
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Calendar} label="Pending Review" value={String(counts.pending)} />
        <StatCard icon={ShieldCheck} label="Verified" value={String(counts.verified)} />
        <StatCard icon={Close} label="Rejected" value={String(counts.rejected)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by business, owner or city…"
          className="lg:max-w-sm lg:flex-1"
        />
        <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(a) => a.id}
        onRowClick={(a) => setSelectedId(a.id)}
        minWidthClass="min-w-[680px]"
        empty={
          loading ? (
            <EmptyState
              title="Loading applications…"
              message="Fetching the latest vendor submissions."
            />
          ) : (
            <EmptyState
              title="No applications found"
              message="New vendor registrations will appear here for review."
            />
          )
        }
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        onPageChange={setPage}
      />

      {toast && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          <span aria-hidden="true" className="text-maroon">✓</span>
          {toast}
        </p>
      )}

      {/* KYC review modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.business : "Review application"}
        size="lg"
        footer={
          selected && (
            <>
              <button
                type="button"
                onClick={() => setAppStatus(selected.id, "Rejected")}
                disabled={selected.status === "Rejected"}
                className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setAppStatus(selected.id, "Verified")}
                disabled={selected.status === "Verified"}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve Vendor
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <TierBadges tiers={selected.requestedTiers} />
              <StatusBadge status={selected.status} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Owner" value={selected.owner} />
              <Detail label="Speciality" value={selected.speciality} />
              <Detail label="Email" value={selected.email} />
              <Detail label="Phone" value={selected.phone} />
              <Detail label="City" value={selected.city} />
              <Detail label="Submitted" value={selected.submitted} />
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                KYC Documents
              </p>
              <ul className="space-y-3">
                {selected.documents.map((d) => (
                  <li
                    key={d.kind}
                    className="flex flex-col gap-3 rounded-xl border border-cream-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{d.kind}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="mt-0.5 text-sm tabular-nums tracking-wide text-ink-soft">{d.number}</p>
                    </div>
                    <div className="flex shrink-0 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDocStatus(selected.id, d.kind, "Verified")}
                        disabled={d.status === "Verified"}
                        className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocStatus(selected.id, d.kind, "Rejected")}
                        disabled={d.status === "Rejected"}
                        className="rounded-full border border-cream-3 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
