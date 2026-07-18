"use client";

/**
 * Venue Management — the full venue catalogue as the admin sees it (every venue,
 * any status), distinct from the Venue Approvals review queue which only handles
 * the pending intake. Lists seed + owner-registered venues with search, status /
 * type / city filters, and quick publish / hide actions that reuse the same
 * moderation API the approvals console does.
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
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Button } from "@/components/ui";
import { Building, ShieldCheck, Rocket, Close, Star } from "@/components/admin/shared/icons";
import {
  venueCityName,
  formatVenuePrice,
  VENUE_TYPES,
  type VenueRecord,
  type VenueStatus,
} from "@/lib/venues";

const PAGE_SIZE = 8;

/** A venue row as returned by GET /api/venues/moderation (status + verified always set). */
interface ModerationVenue extends VenueRecord {
  status: VenueStatus;
  verified: boolean;
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Approved", value: "Approved" },
  { label: "Pending", value: "Pending" },
  { label: "Hidden", value: "Hidden" },
];

const TYPE_OPTIONS = [
  { label: "All Types", value: "All" },
  ...VENUE_TYPES.map((t) => ({ label: t, value: t })),
];

export default function VenueManagement() {
  const [venues, setVenues] = useState<ModerationVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [city, setCity] = useState("All");
  const [page, setPage] = useState(1);
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
      total: venues.length,
      live: venues.filter((v) => v.status === "Approved").length,
      pending: venues.filter((v) => v.status === "Pending").length,
      hidden: venues.filter((v) => v.status === "Hidden").length,
    }),
    [venues],
  );

  const cityOptions = useMemo(() => {
    const names = Array.from(new Set(venues.map((v) => venueCityName(v.city)))).sort();
    return [{ label: "All Cities", value: "All" }, ...names.map((c) => ({ label: c, value: c }))];
  }, [venues]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return venues.filter((v) => {
      const matchesQ =
        !needle ||
        v.name.toLowerCase().includes(needle) ||
        venueCityName(v.city).toLowerCase().includes(needle) ||
        (v.location ?? "").toLowerCase().includes(needle) ||
        (v.ownerName ?? "").toLowerCase().includes(needle);
      const matchesStatus = status === "All" || v.status === status;
      const matchesType = type === "All" || v.type === type;
      const matchesCity = city === "All" || venueCityName(v.city) === city;
      return matchesQ && matchesStatus && matchesType && matchesCity;
    });
  }, [venues, q, status, type, city]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Optimistic status change, rolled back if the request fails (e.g. the server
  // rejects publishing an unverified venue).
  const setVenueStatus = (id: string, next: VenueStatus) => {
    const snapshot = venues;
    setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, status: next } : v)));
    setToast(
      next === "Approved"
        ? "Venue published — now live on /venues"
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
    { key: "city", header: "City", cell: (v) => <span className="text-ink-soft">{venueCityName(v.city)}</span> },
    { key: "type", header: "Type", cell: (v) => <span className="text-ink-soft">{v.type}</span> },
    { key: "capacity", header: "Capacity", cell: (v) => <span className="text-ink-soft">{v.capacity || "—"}</span> },
    {
      key: "rating",
      header: "Rating",
      cell: (v) => (
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <Star className="h-4 w-4 text-maroon" />
          {v.rating?.toFixed(1) ?? "—"}
          <span className="text-xs">({v.reviews ?? 0})</span>
        </span>
      ),
    },
    {
      key: "price",
      header: "From",
      cell: (v) => (
        <span className="font-display font-semibold text-ink">
          {v.priceFrom || formatVenuePrice(v.price)}
        </span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-2">
          {v.status === "Approved" ? (
            <Button size="sm" variant="secondary" onClick={stop(() => setVenueStatus(v.id, "Hidden"))}>
              Hide
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              disabled={!v.verified}
              onClick={stop(() => setVenueStatus(v.id, "Approved"))}
            >
              {v.verified ? "Publish" : "Unverified"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Venues"
        subtitle="The full venue catalogue — seed and owner-listed, any status. Publish or hide venues at a glance."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building} label="Total Venues" value={String(counts.total)} />
        <StatCard icon={Rocket} label="Live" value={String(counts.live)} />
        <StatCard icon={ShieldCheck} label="Pending" value={String(counts.pending)} />
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
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="Type" value={type} options={TYPE_OPTIONS} onChange={onFilter(setType)} />
          <SelectFilter label="City" value={city} options={cityOptions} onChange={onFilter(setCity)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(v) => v.id}
        minWidthClass="min-w-[1040px]"
        empty={
          <EmptyState
            title={loading ? "Loading venues…" : "No venues found"}
            message={
              loading
                ? "Fetching the venue catalogue."
                : "Try a different search term or filters."
            }
          />
        }
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
