"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/admin/shared/PageHeader";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import TierBadges from "@/components/admin/shared/TierBadges";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import { StarSolid, ChevronRight } from "@/components/admin/shared/icons";
import { queryVendors, vendorCities } from "@/lib/admin/mockData";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import type { AdminVendor } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const TIER_OPTIONS = [
  { label: "All Tiers", value: "All" },
  { label: "Silver", value: "Silver" },
  { label: "Gold", value: "Gold" },
  { label: "Platinum", value: "Platinum" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Verified", value: "Verified" },
  { label: "Pending", value: "Pending" },
  { label: "Rejected", value: "Rejected" },
];

/**
 * Vendor list page (presentation + local query state). Holds search/filter/page
 * state and runs them through the `queryVendors` selector (mock today, API
 * later). Row click navigates to the vendor detail route.
 */
export default function VendorList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The search term lives in the URL (`?q=`) so the topbar global search and the
  // in-page search bar share one source of truth.
  const q = searchParams.get("q") ?? "";
  const setQ = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [tier, setTier] = useState("All");
  const [status, setStatus] = useState("All");
  const [city, setCity] = useState("All");
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever a filter changes.
  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const result = useMemo(
    () =>
      queryVendors({
        q,
        tier: tier as never,
        status: status as never,
        city: city as never,
        page,
        pageSize: PAGE_SIZE,
      }),
    [q, tier, status, city, page],
  );

  const cityOptions = useMemo(
    () => [
      { label: "All Cities", value: "All" },
      ...vendorCities.map((c) => ({ label: c, value: c })),
    ],
    [],
  );

  // Real customer ratings, matched to vendors by name (best-effort).
  const ratings = useVendorRatings();

  const columns: Column<AdminVendor>[] = [
    {
      key: "business",
      header: "Vendor",
      cell: (v) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{v.business}</p>
          <p className="text-xs text-ink-soft">{v.owner}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (v) => (
        <span className="text-ink-soft">
          {v.city}, {v.state}
        </span>
      ),
    },
    { key: "tier", header: "Tiers", cell: (v) => <TierBadges tiers={v.tiers} /> },
    {
      key: "status",
      header: "Status",
      cell: (v) => (
        <StatusBadge status={v.suspended ? "Suspended" : v.status} />
      ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (v) => {
        const stat = statFor(ratings, { id: v.id, name: v.business });
        return (
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-ink">
              <StarSolid className="h-4 w-4 text-maroon" />
              {v.rating}
              <span className="text-xs text-ink-soft">({v.reviews})</span>
            </span>
            {stat && (
              <p className="text-xs font-semibold text-maroon">
                ★ {stat.rating} · {stat.count} verified
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "bookings",
      header: "Bookings",
      cell: (v) => <span className="text-ink">{v.totalBookings}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "go",
      header: "",
      cell: () => <ChevronRight className="h-4 w-4 text-ink-soft" />,
      className: "w-10 text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Vendor Management"
        subtitle="Browse, search and manage every caterer on the platform."
      />

      {/* Toolbar — search + filters. EXTENSION POINT: an export button / saved
          views can sit at the right of this row later. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by business, owner or city…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-wrap gap-2.5">
          <SelectFilter label="Tier" value={tier} options={TIER_OPTIONS} onChange={onFilter(setTier)} />
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <SelectFilter label="City" value={city} options={cityOptions} onChange={onFilter(setCity)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(v) => v.id}
        onRowClick={(v) => router.push(`/admin/vendors/${v.id}`)}
        empty={
          <EmptyState
            title="No vendors found"
            message="Try a different search term or clear the filters."
          />
        }
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        onPageChange={setPage}
      />
    </div>
  );
}
