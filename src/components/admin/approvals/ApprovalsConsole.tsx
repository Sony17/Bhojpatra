"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
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
import { refreshAdminSession } from "@/lib/adminAuth";
import { TIER_ORDER, sortTiers } from "@/lib/admin/types";
import type {
  VendorApplication,
  VendorTier,
  VerificationStatus,
} from "@/lib/admin/types";

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Verified", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
];

/** The tiers currently in force for an application: the admin's explicit
 *  decision if made, otherwise the price-derived baseline shown as the default. */
function effectiveTiers(a: VendorApplication): VendorTier[] {
  return sortTiers(a.assignedTiers ?? a.requestedTiers);
}

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
      if (res.ok) return;
      // The store rejected the change — undo the optimistic update.
      setApps(snapshot);
      // A 401/403 means the admin session isn't valid for the API even though
      // the shell is still showing (it only re-checks the session on a full
      // reload). Re-validate so the shell bounces to the login screen, and say
      // so plainly instead of the misleading "try again".
      if (res.status === 401 || res.status === 403) {
        setToast("Your admin session has expired — please sign in again.");
        void refreshAdminSession();
        return;
      }
      const message = await res
        .json()
        .then((d: { error?: string }) => d?.error)
        .catch(() => null);
      setToast(message || "Couldn't save. Please try again.");
    } catch {
      setApps(snapshot);
      setToast("Couldn't save. Please check your connection and try again.");
    }
  };

  const setAppStatus = (id: string, next: VerificationStatus) => {
    const snapshot = apps;
    const current = apps.find((a) => a.id === id);
    // Lock in the tier selection at the moment of approval so the vendor's
    // catalog badges match what the admin sees here (even if untouched → the
    // price-derived default).
    const tiers =
      next === "Verified" && current ? effectiveTiers(current) : undefined;
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: next,
              assignedTiers: tiers ?? a.assignedTiers,
              documents:
                next === "Verified"
                  ? a.documents.map((d) => ({ ...d, status: "Verified" as const }))
                  : a.documents,
            }
          : a,
      ),
    );
    setToast(`Application ${next === "Verified" ? "approved" : "rejected"}`);
    void persist(id, tiers ? { status: next, tiers } : { status: next }, snapshot);
  };

  // Set the vendor's assigned tiers (multi-select). A vendor must sit in at
  // least one tier, so an empty selection is ignored. Persists immediately,
  // mirroring the per-document review pattern.
  const setTiers = (id: string, next: VendorTier[]) => {
    const tiers = sortTiers(next);
    if (tiers.length === 0) return;
    const snapshot = apps;
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, assignedTiers: tiers } : a)),
    );
    setToast("Tiers updated");
    void persist(id, { tiers }, snapshot);
  };

  const toggleTier = (id: string, t: VendorTier) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const current = effectiveTiers(app);
    setTiers(
      id,
      current.includes(t)
        ? current.filter((x) => x !== t)
        : [...current, t],
    );
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAppStatus(selected.id, "Rejected")}
                disabled={selected.status === "Rejected"}
              >
                Reject
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setAppStatus(selected.id, "Verified")}
                disabled={selected.status === "Verified"}
              >
                Approve Vendor
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <TierBadges tiers={effectiveTiers(selected)} />
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

            {/* Tier assignment — multi-select; defaults to the price-derived
                tiers the vendor requested until the admin decides otherwise. */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Assigned Tiers
              </p>
              <p className="mb-3 text-sm text-ink-soft">
                Choose every marketplace tier this vendor serves — a caterer can
                sit in more than one band. Requested: {selected.requestedTiers.join(", ")}.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TIER_ORDER.map((t) => {
                  const active = effectiveTiers(selected).includes(t);
                  const last = active && effectiveTiers(selected).length === 1;
                  return (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2.5 rounded-control border border-cream-3 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-2"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-maroon"
                        checked={active}
                        disabled={last}
                        onChange={() => toggleTier(selected.id, t)}
                      />
                      {t}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                KYC Documents
              </p>
              <ul className="space-y-3">
                {selected.documents.map((d) => (
                  <li
                    key={d.kind}
                    className="flex flex-col gap-3 rounded-card border border-cream-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
                        <p className="font-medium text-ink">{d.kind}</p>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="mt-0.5 text-sm tabular-nums tracking-wide text-ink-soft">{d.number}</p>
                    </div>
                    <div className="flex shrink-0 gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setDocStatus(selected.id, d.kind, "Verified")}
                        disabled={d.status === "Verified"}
                      >
                        Verify
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setDocStatus(selected.id, d.kind, "Rejected")}
                        disabled={d.status === "Rejected"}
                      >
                        Reject
                      </Button>
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
