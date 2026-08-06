"use client";

/**
 * Menu Moderation console — the takedown-model review queue for live vendor
 * content. Vendor menus go live the moment they're published (as "Pending");
 * this console lets admins Approve them (cleared until their next edit) or
 * Hide them (removed from the /book wizard, /vendors catalog and their public
 * detail page until restored).
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
import { Badge, Button } from "@/components/ui";
import { Calendar, ShieldCheck, Close } from "@/components/admin/shared/icons";
import { menuCategories } from "@/lib/data";
import type { ModerationStatus, VendorMenuSection, VendorSingleStallMenu } from "@/lib/vendorMenus";

const PAGE_SIZE = 8;

interface ModerationVendor {
  id: string;
  business: string;
  city: string;
  state: string;
  cuisines: string[];
  about?: string;
  priceFrom: number;
  image: string;
  verified: boolean;
  moderation: ModerationStatus;
  updatedAt: string;
  menu: VendorMenuSection[];
  singleStallMenu?: VendorSingleStallMenu | null;
  gallery: string[];
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Hidden", value: "Hidden" },
];

const CATEGORY_NAME = new Map(menuCategories.map((c) => [c.id, c.name]));

function ModerationBadge({ status }: { status: ModerationStatus }) {
  const tone =
    status === "Approved"
      ? "solid"
      : status === "Pending"
        ? "outline"
        : "muted";
  return <Badge tone={tone}>{status}</Badge>;
}

export default function MenuModerationConsole() {
  const [vendors, setVendors] = useState<ModerationVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/vendors/moderation", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { vendors?: ModerationVendor[] }) => {
        if (active) setVendors(data.vendors ?? []);
      })
      .catch(() => {
        if (active) setToast("Couldn't load vendors. Please refresh.");
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
      pending: vendors.filter((v) => v.moderation === "Pending").length,
      approved: vendors.filter((v) => v.moderation === "Approved").length,
      hidden: vendors.filter((v) => v.moderation === "Hidden").length,
    }),
    [vendors],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesQ =
        query === "" ||
        v.business.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query) ||
        v.cuisines.some((c) => c.toLowerCase().includes(query));
      return matchesQ && (status === "All" || v.moderation === status);
    });
  }, [vendors, q, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = selectedId
    ? vendors.find((v) => v.id === selectedId) ?? null
    : null;

  // Optimistic status change, rolled back if the request fails.
  const setModeration = (id: string, next: ModerationStatus) => {
    const snapshot = vendors;
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, moderation: next } : v)),
    );
    setToast(
      next === "Approved"
        ? "Menu approved"
        : next === "Hidden"
          ? "Menu hidden from customers"
          : "Marked for review",
    );
    fetch(`/api/vendors/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
      })
      .catch(() => {
        setVendors(snapshot);
        setToast("Couldn't save. Please try again.");
      });
  };

  const dishCount = (v: ModerationVendor) =>
    v.menu.reduce((n, s) => n + (s.hidden ? 0 : s.items.length), 0);

  const columns: Column<ModerationVendor>[] = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (v) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-cream-3 bg-cream-2">
            <Image src={v.image} alt="" fill sizes="56px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{v.business}</p>
            <p className="text-xs text-ink-soft">
              {v.city}
              {v.cuisines.length > 0 && ` · ${v.cuisines.join(", ")}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "content",
      header: "Published",
      cell: (v) => (
        <span className="text-ink-soft">
          {dishCount(v)} dishes · {v.gallery.length} gallery photos
        </span>
      ),
    },
    {
      key: "updated",
      header: "Last Edited",
      cell: (v) => (
        <span className="text-ink-soft">{v.updatedAt.slice(0, 10)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => <ModerationBadge status={v.moderation} />,
    },
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
        title="Menu Moderation"
        subtitle="Review published vendor menus, dish photos and galleries. Hidden vendors disappear from every customer surface."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Calendar} label="Pending Review" value={String(counts.pending)} />
        <StatCard icon={ShieldCheck} label="Approved" value={String(counts.approved)} />
        <StatCard icon={Close} label="Hidden" value={String(counts.hidden)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by business, city or cuisine…"
          className="lg:max-w-sm lg:flex-1"
        />
        <SelectFilter
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={onFilter(setStatus)}
        />
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(v) => v.id}
        onRowClick={(v) => setSelectedId(v.id)}
        minWidthClass="min-w-[720px]"
        empty={
          loading ? (
            <EmptyState
              title="Loading vendor menus…"
              message="Fetching the latest published content."
            />
          ) : (
            <EmptyState
              title="No vendor menus found"
              message="Menus published from the vendor dashboard appear here for review."
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
        title={selected ? selected.business : "Review menu"}
        size="lg"
        footer={
          selected && (
            <>
              <Button
                variant="secondary"
                onClick={() => setModeration(selected.id, "Hidden")}
                disabled={selected.moderation === "Hidden"}
              >
                Hide from Customers
              </Button>
              <Button
                variant="primary"
                onClick={() => setModeration(selected.id, "Approved")}
                disabled={selected.moderation === "Approved"}
              >
                Approve Menu
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <ModerationBadge status={selected.moderation} />
              {selected.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-ink">
                  ✓ KYC Verified
                </span>
              )}
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="City" value={`${selected.city}${selected.state ? `, ${selected.state}` : ""}`} />
              <Detail label="Base Price" value={`₹${selected.priceFrom} / plate`} />
              <Detail
                label="Cuisines"
                value={selected.cuisines.join(", ") || "—"}
              />
              <Detail label="Last Edited" value={selected.updatedAt.slice(0, 10)} />
            </dl>

            {selected.about && (
              <Detail label="About" value={selected.about} />
            )}

            {/* Menu by course, with dish photos */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Published Menu
              </p>
              <ul className="space-y-3">
                {selected.menu.map((s) => (
                  <li
                    key={s.categoryId}
                    className="rounded-xl border border-cream-3 p-4"
                  >
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
                      <p className="font-medium text-ink">
                        {CATEGORY_NAME.get(s.categoryId) ?? s.categoryId}
                      </p>
                      <span className="text-xs text-ink-soft">
                        +₹{s.perPlate}/plate
                      </span>
                      {s.hidden && (
                        <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                          Paused by vendor
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {s.items.map((it, i) => (
                        <span
                          key={`${it.name}-${i}`}
                          className="flex items-center gap-1.5 rounded-full border border-cream-3 bg-cream/40 py-1 pl-1.5 pr-3 text-sm text-ink"
                        >
                          {it.photo ? (
                            <span className="relative block h-6 w-6 shrink-0 overflow-hidden rounded-full border border-cream-3">
                              <Image src={it.photo} alt="" fill sizes="24px" className="object-cover" />
                            </span>
                          ) : (
                            <span className="w-1" />
                          )}
                          <span
                            aria-hidden="true"
                            className={
                              "inline-block h-2.5 w-2.5 rounded-sm border " +
                              (it.diet === "veg"
                                ? "border-ink"
                                : "border-maroon bg-maroon")
                            }
                          />
                          {it.name}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Single Stall Menu */}
            {selected.singleStallMenu && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  🎪 Single Stall Menu
                </p>
                <div className="rounded-xl border border-cream-3 p-4">
                  <div className="flex items-start justify-between gap-4 border-b border-cream-3 pb-3">
                    <div>
                      <h4 className="font-display text-base font-bold text-ink">
                        {selected.singleStallMenu.title}
                      </h4>
                      {selected.singleStallMenu.description && (
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {selected.singleStallMenu.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold text-maroon">
                        ₹{selected.singleStallMenu.pricePerGuest} / guest
                      </p>
                      {selected.singleStallMenu.minGuests != null && selected.singleStallMenu.minGuests > 0 && (
                        <p className="text-[11px] font-medium text-ink-soft">
                          Min. {selected.singleStallMenu.minGuests} guests
                        </p>
                      )}
                    </div>
                  </div>

                  {selected.singleStallMenu.coverPhoto && (
                    <div className="relative mt-3 aspect-[21/9] w-full overflow-hidden rounded-lg border border-cream-3 bg-cream-2 sm:aspect-[3/1]">
                      <Image
                        src={selected.singleStallMenu.coverPhoto}
                        alt={selected.singleStallMenu.title}
                        fill
                        unoptimized
                        sizes="600px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  {selected.singleStallMenu.items.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold text-ink-soft">
                        Included Dishes ({selected.singleStallMenu.items.length})
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selected.singleStallMenu.items.map((it, i) => (
                          <div
                            key={`${it.name}-${i}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-cream-3 bg-cream/30 p-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  aria-hidden="true"
                                  className={
                                    "inline-block h-2.5 w-2.5 shrink-0 rounded-xs border " +
                                    (it.diet === "veg"
                                      ? "border-maroon bg-white"
                                      : "border-maroon bg-maroon")
                                  }
                                />
                                <p className="truncate text-xs font-semibold text-ink">
                                  {it.name}
                                </p>
                              </div>
                              {it.description && (
                                <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                                  {it.description}
                                </p>
                              )}
                            </div>
                            {it.price != null && it.price > 0 && (
                              <span className="shrink-0 text-xs font-bold text-maroon">
                                ₹{it.price}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gallery */}
            {selected.gallery.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Gallery ({selected.gallery.length})
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {selected.gallery.map((url) => (
                    <span
                      key={url}
                      className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-cream-3 bg-cream-2"
                    >
                      <Image src={url} alt="" fill sizes="160px" className="object-cover" />
                    </span>
                  ))}
                </div>
              </div>
            )}
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
