"use client";

/**
 * Venue Approvals console — the pre-approval review queue for owner-registered
 * venues. A Venue-Owner partner publishes a venue from their dashboard; it lands
 * here as "Pending" and stays off the /venues catalogue, its detail page and the
 * booking flow until an admin verifies its details and Approves it. The pipeline
 * is: review the application → verify the details → publish (Approve). Publishing
 * is gated on verification — a venue can't go live until an admin has confirmed
 * its details. "Hidden" is a takedown for a venue that was live. Legacy venues
 * saved before approvals show as already Approved and Verified.
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Button } from "@/components/ui";
import { Calendar, ShieldCheck, Rocket, Close } from "@/components/admin/shared/icons";
import {
  venueCityName,
  formatVenuePrice,
  type VenueRecord,
  type VenueStatus,
} from "@/lib/venues";

const PAGE_SIZE = 8;

/** A venue row as returned by GET /api/venues/moderation (status + verified
 *  always set). */
interface ModerationVenue extends VenueRecord {
  status: VenueStatus;
  verified: boolean;
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Hidden", value: "Hidden" },
];

const VERIFICATION_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Verified", value: "Verified" },
  { label: "Unverified", value: "Unverified" },
];

function StatusPill({ status }: { status: VenueStatus }) {
  const cls =
    status === "Approved"
      ? "bg-maroon text-cream"
      : status === "Pending"
        ? "border border-maroon text-maroon"
        : "bg-cream-2 text-ink-soft";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
        cls
      }
    >
      {status}
    </span>
  );
}

function VerificationPill({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
      <ShieldCheck className="h-3.5 w-3.5" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-maroon px-3 py-1 text-xs font-semibold text-maroon">
      Unverified
    </span>
  );
}

export default function VenueApprovalsConsole() {
  const [venues, setVenues] = useState<ModerationVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [verification, setVerification] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/venues/moderation", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { venues?: ModerationVenue[] }) => {
        if (active) setVenues(data.venues ?? []);
      })
      .catch(() => {
        if (active) setToast("Couldn't load venues. Please refresh.");
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
      pending: venues.filter((v) => v.status === "Pending").length,
      unverified: venues.filter((v) => !v.verified && v.status !== "Hidden").length,
      approved: venues.filter((v) => v.status === "Approved").length,
      hidden: venues.filter((v) => v.status === "Hidden").length,
    }),
    [venues],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return venues.filter((v) => {
      const matchesQ =
        query === "" ||
        v.name.toLowerCase().includes(query) ||
        venueCityName(v.city).toLowerCase().includes(query) ||
        (v.location ?? "").toLowerCase().includes(query) ||
        (v.ownerName ?? "").toLowerCase().includes(query);
      const matchesVerification =
        verification === "All" ||
        (verification === "Verified" ? v.verified : !v.verified);
      return (
        matchesQ &&
        matchesVerification &&
        (status === "All" || v.status === status)
      );
    });
  }, [venues, q, status, verification]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = selectedId
    ? venues.find((v) => v.id === selectedId) ?? null
    : null;

  // Optimistic status change, rolled back if the request fails (e.g. the server
  // rejects publishing an unverified venue).
  const setVenueStatus = (id: string, next: VenueStatus) => {
    const snapshot = venues;
    setVenues((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: next } : v)),
    );
    setToast(
      next === "Approved"
        ? "Venue approved — now live on /venues"
        : next === "Hidden"
          ? "Venue hidden from customers"
          : "Sent back for review",
    );
    fetch(`/api/venues/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
      })
      .catch(() => {
        setVenues(snapshot);
        setToast("Couldn't save. Please try again.");
      });
  };

  // Optimistic verification toggle, rolled back if the request fails.
  const setVenueVerified = (id: string, next: boolean) => {
    const snapshot = venues;
    setVenues((prev) =>
      prev.map((v) => (v.id === id ? { ...v, verified: next } : v)),
    );
    setToast(
      next
        ? "Details verified — ready to publish"
        : "Verification removed",
    );
    fetch(`/api/venues/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
      })
      .catch(() => {
        setVenues(snapshot);
        setToast("Couldn't save. Please try again.");
      });
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const columns: Column<ModerationVenue>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (v) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-cream-3 bg-cream-2">
            <Image src={v.image} alt="" fill sizes="56px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{v.name}</p>
            <p className="truncate text-xs text-ink-soft">{v.location || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (v) => (
        <span className="text-ink-soft">{v.ownerName || v.ownerCode}</span>
      ),
    },
    {
      key: "city",
      header: "City",
      cell: (v) => <span className="text-ink-soft">{venueCityName(v.city)}</span>,
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (v) => <span className="text-ink-soft">{v.capacity || "—"}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (v) => <span className="text-ink-soft">{v.type}</span>,
    },
    {
      key: "verification",
      header: "Verification",
      cell: (v) => <VerificationPill verified={v.verified} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => <StatusPill status={v.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-2">
          {!v.verified ? (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              onClick={stop(() => setVenueVerified(v.id, true))}
            >
              Verify
            </Button>
          ) : v.status !== "Approved" ? (
            <Button
              size="sm"
              variant="primary"
              onClick={stop(() => setVenueStatus(v.id, "Approved"))}
            >
              Publish
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={stop(() => setVenueStatus(v.id, "Hidden"))}
            >
              Hide
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={stop(() => setSelectedId(v.id))}
          >
            Review
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Venue Approvals"
        subtitle="Review venue applications, verify their details, then publish the approved ones. A venue stays off /venues until you verify and approve it."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Pending Review" value={String(counts.pending)} />
        <StatCard icon={ShieldCheck} label="Awaiting Verification" value={String(counts.unverified)} />
        <StatCard icon={Rocket} label="Approved" value={String(counts.approved)} />
        <StatCard icon={Close} label="Hidden" value={String(counts.hidden)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by venue, city, area or owner…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter
            label="Verification"
            value={verification}
            options={VERIFICATION_OPTIONS}
            onChange={onFilter(setVerification)}
          />
          <SelectFilter
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={onFilter(setStatus)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(v) => v.id}
        onRowClick={(v) => setSelectedId(v.id)}
        minWidthClass="min-w-[1040px]"
        empty={
          loading ? (
            <EmptyState
              title="Loading venues…"
              message="Fetching the latest owner submissions."
            />
          ) : (
            <EmptyState
              title="No venues found"
              message="Venues published from a venue-owner dashboard appear here for approval."
            />
          )
        }
      />

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
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

      {/* Review modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.name : "Review venue"}
        size="lg"
        footer={
          selected && (
            <>
              <Button
                variant="secondary"
                leftIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => setVenueVerified(selected.id, !selected.verified)}
              >
                {selected.verified ? "Mark Unverified" : "Mark Verified"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setVenueStatus(selected.id, "Hidden")}
                disabled={selected.status === "Hidden"}
              >
                Hide from Customers
              </Button>
              <Button
                variant="primary"
                onClick={() => setVenueStatus(selected.id, "Approved")}
                disabled={selected.status === "Approved" || !selected.verified}
              >
                Publish Venue
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-cream-3 bg-cream-2">
              <Image
                src={selected.image}
                alt={selected.name}
                fill
                sizes="(min-width: 640px) 560px, 100vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <VerificationPill verified={selected.verified} />
              <StatusPill status={selected.status} />
              <span className="inline-flex items-center rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-ink">
                {selected.type}
              </span>
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            {!selected.verified && (
              <p className="rounded-xl border border-maroon bg-cream-2 px-4 py-3 text-sm text-ink">
                Verify the venue&rsquo;s details to enable publishing.
              </p>
            )}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail
                label="Location"
                value={
                  [selected.location, venueCityName(selected.city)]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Detail label="Capacity" value={selected.capacity || "—"} />
              <Detail
                label="Starting Price"
                value={selected.priceFrom || formatVenuePrice(selected.price)}
              />
              <Detail
                label="Owner"
                value={selected.ownerName || selected.ownerCode}
              />
              <Detail label="Owner Code" value={selected.ownerCode} />
              {selected.phone && <Detail label="Phone" value={selected.phone} />}
            </dl>
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
