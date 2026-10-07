"use client";

/**
 * Menu Moderation console — the takedown-model review queue for live vendor
 * content. A vendor's menu is published only once an admin Approves it here —
 * which the API allows only after their KYC application is Verified. A live
 * vendor's later edit waits here as "Pending" while their last approved
 * content stays live. Hide removes them from the /book wizard, /vendors
 * catalog and their public detail page until restored. Recognition badges
 * are granted here too (vendors can only apply).
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { photoNeedsUnoptimized } from "@/lib/photoLinks";
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
import type {
  BadgeDecision,
  ModerationStatus,
  RecognitionBadgeKey,
  VendorBadgesState,
  VendorMenuSection,
} from "@/lib/vendorMenus";

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
  gallery: string[];
  /** KYC application status (null = not submitted). */
  applicationStatus: string | null;
  /** True while a live vendor's previous approved content is still shown. */
  liveSnapshot: boolean;
  badges: VendorBadgesState | null;
}

const BADGE_LABEL: Record<RecognitionBadgeKey, string> = {
  verified: "Verified",
  icon: "Icon",
  heritage: "Heritage",
};

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
        if (!active) return;
        setVendors(data.vendors ?? []);
        // Deep link from Vendor Approvals: /admin/menus?vendor=<id>.
        const wanted = new URLSearchParams(window.location.search).get("vendor");
        if (wanted && data.vendors?.some((v) => v.id === wanted)) setSelectedId(wanted);
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

  // Platform seed stalls (demo vendors with no owner account) — one switch
  // hides or restores all of them; the SAMPLE catalog cards follow it.
  const [seeds, setSeeds] = useState<{ total: number; hidden: number } | null>(null);
  const [seedsBusy, setSeedsBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/vendors/moderation/seeds")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total: number; hidden: number } | null) => {
        if (alive && d) setSeeds(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const seedsHidden = Boolean(seeds && seeds.total > 0 && seeds.hidden === seeds.total);
  const toggleSeeds = async () => {
    if (!seeds) return;
    const hide = !seedsHidden;
    const ok = window.confirm(
      hide
        ? `Hide all ${seeds.total} platform seed stalls and the SAMPLE catalog cards from customers? Only approved real vendors will remain visible. You can undo this with the same button.`
        : `Show the ${seeds.total} platform seed stalls and SAMPLE catalog cards to customers again?`,
    );
    if (!ok) return;
    setSeedsBusy(true);
    try {
      const res = await fetch("/api/vendors/moderation/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: hide }),
      });
      const d = (await res.json().catch(() => null)) as
        | { total?: number; hidden?: number; error?: string }
        | null;
      if (!res.ok) throw new Error(d?.error || "Couldn't save. Please try again.");
      setSeeds({ total: d?.total ?? seeds.total, hidden: d?.hidden ?? 0 });
      setToast(hide ? "Seed stalls hidden from customers" : "Seed stalls shown to customers");
    } catch (err) {
      setToast((err as Error).message || "Couldn't save. Please try again.");
    } finally {
      setSeedsBusy(false);
    }
  };

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
      .then(async (res) => {
        if (res.ok) return;
        // Surface the server's reason (e.g. KYC not yet verified).
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Couldn't save. Please try again.");
      })
      .catch((err: Error) => {
        setVendors(snapshot);
        setToast(err.message || "Couldn't save. Please try again.");
      });
  };

  // Grant / reject / revoke a recognition badge (admin-only path).
  const decideBadge = (id: string, key: RecognitionBadgeKey, decision: BadgeDecision) => {
    fetch(`/api/vendors/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badge: { key, decision } }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { badges?: VendorBadgesState; error?: string }
          | null;
        if (!res.ok || !data?.badges) throw new Error(data?.error || "Couldn't save. Please try again.");
        setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, badges: data.badges! } : v)));
        setToast(`${BADGE_LABEL[key]} badge ${decision === "grant" ? "granted" : decision === "reject" ? "rejected" : "revoked"}`);
      })
      .catch((err: Error) => setToast(err.message));
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
            <Image src={v.image} unoptimized={photoNeedsUnoptimized(v.image)} alt="" fill sizes="56px" className="object-cover" />
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

      {seeds && seeds.total > 0 && (
        <div className="flex flex-col gap-3 rounded-card border border-cream-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Platform seed stalls (demo data)</p>
            <p className="text-xs text-ink/60">
              {seeds.total} demo stalls and the SAMPLE catalog cards are{" "}
              {seedsHidden ? (
                <strong>hidden from customers</strong>
              ) : (
                <strong>visible to customers</strong>
              )}
              . Hide them for launch so only approved real vendors show; the rows stay in the database and can be shown again.
            </p>
          </div>
          <Button
            variant={seedsHidden ? "secondary" : "primary"}
            onClick={toggleSeeds}
            disabled={seedsBusy}
          >
            {seedsBusy ? "Saving…" : seedsHidden ? "Show seed stalls" : "Hide all seed stalls"}
          </Button>
        </div>
      )}

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
                disabled={selected.moderation === "Approved" || selected.applicationStatus !== "Verified"}
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

            {selected.applicationStatus !== "Verified" && (
              <p className="rounded-control border border-maroon/30 bg-maroon/5 px-3 py-2 text-sm text-ink">
                {selected.applicationStatus
                  ? `KYC application is ${selected.applicationStatus}. Approve it in Vendor Approvals before publishing this menu.`
                  : "This vendor hasn't submitted their KYC application yet — their menu can't be published."}
              </p>
            )}
            {selected.liveSnapshot && selected.moderation === "Pending" && (
              <p className="text-sm text-ink-soft">
                Customers currently see this vendor&apos;s last approved listing; approving publishes the edits below.
              </p>
            )}

            {/* Recognition badges — vendors apply, only admins grant. */}
            {(selected.badges?.applied.length || selected.badges?.granted.length) ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Recognition Badges
                </p>
                <ul className="space-y-2">
                  {(Object.keys(BADGE_LABEL) as RecognitionBadgeKey[])
                    .filter((k) => selected.badges?.applied.includes(k) || selected.badges?.granted.includes(k))
                    .map((k) => {
                      const granted = Boolean(selected.badges?.granted.includes(k));
                      return (
                        <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-cream-3 px-3 py-2">
                          <span className="text-sm font-medium text-ink">
                            {BADGE_LABEL[k]} · {granted ? "Granted" : "Applied"}
                          </span>
                          <span className="flex gap-2">
                            {granted ? (
                              <Button size="sm" variant="secondary" onClick={() => decideBadge(selected.id, k, "revoke")}>
                                Revoke
                              </Button>
                            ) : (
                              <>
                                <Button size="sm" variant="secondary" onClick={() => decideBadge(selected.id, k, "reject")}>
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => decideBadge(selected.id, k, "grant")}>
                                  Grant
                                </Button>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : null}

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
                              <Image src={it.photo} alt="" unoptimized={photoNeedsUnoptimized(it.photo)} fill sizes="24px" className="object-cover" />
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
