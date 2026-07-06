"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import TierBadges from "@/components/admin/shared/TierBadges";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import EmptyState from "@/components/admin/shared/EmptyState";
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog";
import { money } from "@/components/admin/shared/money";
import BookingsMiniTable from "@/components/admin/bookings/BookingsMiniTable";
import { Calendar, StarSolid, Users, Wallet } from "@/components/admin/shared/icons";
import { getBookingsByVendor } from "@/lib/admin/mockData";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import {
  TIER_ORDER,
  sortTiers,
  type AdminVendor,
  type VendorDocument,
  type VendorTier,
  type VerificationStatus,
} from "@/lib/admin/types";

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "kyc", label: "KYC & Documents" },
  { id: "menu", label: "Menu" },
  { id: "bookings", label: "Bookings" },
];

type Dialog =
  | { kind: "reject" }
  | { kind: "suspend" }
  | { kind: "reactivate" }
  | null;

/**
 * Vendor detail page. Receives the vendor (looked up by the route) and seeds
 * local state so mock verify / reject / suspend / tier actions feel real. When
 * the API lands, replace the local mutations with calls + refetch; the layout
 * and props are unchanged. Renders a friendly not-found state for bad ids.
 */
export default function VendorDetail({ vendor }: { vendor: AdminVendor | null }) {
  if (!vendor) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin Panel" title="Vendor not found" />
        <EmptyState
          title="We couldn't find that vendor"
          message="The vendor may have been removed or the link is incorrect."
          action={
            <Link
              href="/admin/vendors"
              className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-maroon-dark"
            >
              Back to Vendors
            </Link>
          }
        />
      </div>
    );
  }

  return <VendorDetailView vendor={vendor} />;
}

function VendorDetailView({ vendor }: { vendor: AdminVendor }) {
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState<VerificationStatus>(vendor.status);
  const [tiers, setTiers] = useState<VendorTier[]>(sortTiers(vendor.tiers));
  const [suspended, setSuspended] = useState(vendor.suspended);
  const [docs, setDocs] = useState<VendorDocument[]>(vendor.documents);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => setToast(msg);

  // A vendor can sit in several tiers at once — toggle bands on/off, but never
  // leave them with none.
  const toggleTier = (t: VendorTier) => {
    setTiers((prev) => {
      const next = prev.includes(t)
        ? prev.filter((x) => x !== t)
        : [...prev, t];
      if (next.length === 0) return prev;
      flash("Tiers updated");
      return sortTiers(next);
    });
  };

  const verify = () => {
    setStatus("Verified");
    setDocs((prev) => prev.map((d) => ({ ...d, status: "Verified" })));
    flash("Vendor verified");
  };

  const confirmDialog = () => {
    if (dialog?.kind === "reject") {
      setStatus("Rejected");
      flash("Vendor rejected");
    } else if (dialog?.kind === "suspend") {
      setSuspended(true);
      flash("Vendor suspended");
    } else if (dialog?.kind === "reactivate") {
      setSuspended(false);
      flash("Vendor reactivated");
    }
    setDialog(null);
  };

  const setDocStatus = (kind: string, next: VerificationStatus) =>
    setDocs((prev) =>
      prev.map((d) => (d.kind === kind ? { ...d, status: next } : d)),
    );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline"
      >
        ← Back to Vendors
      </Link>

      <PageHeader
        eyebrow={vendor.id}
        title={vendor.business}
        subtitle={`${vendor.owner} · ${vendor.city}, ${vendor.state}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {toast && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1.5 text-sm font-medium text-ink"
              >
                <span aria-hidden="true" className="text-maroon">✓</span>
                {toast}
              </span>
            )}
            {status !== "Verified" && (
              <button
                type="button"
                onClick={verify}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
              >
                Verify
              </button>
            )}
            {status !== "Rejected" && (
              <button
                type="button"
                onClick={() => setDialog({ kind: "reject" })}
                className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2"
              >
                Reject
              </button>
            )}
            {suspended ? (
              <button
                type="button"
                onClick={() => setDialog({ kind: "reactivate" })}
                className="rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition-colors hover:bg-maroon/5"
              >
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDialog({ kind: "suspend" })}
                className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2"
              >
                Suspend
              </button>
            )}
          </div>
        }
      />

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <TierBadges tiers={tiers} />
        <StatusBadge status={status} />
        {suspended && <StatusBadge status="Suspended" />}
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <OverviewTab vendor={vendor} tiers={tiers} onToggleTier={toggleTier} />
      )}
      {tab === "kyc" && <KycTab docs={docs} onSetDoc={setDocStatus} />}
      {tab === "menu" && (
        <EmptyState
          title="Menu management is coming"
          message="Per-vendor menus, packages and pricing arrive with the Menu & Catalog phase."
        />
      )}
      {tab === "bookings" && (
        <BookingsMiniTable
          rows={getBookingsByVendor(vendor.business)}
          party="customer"
          emptyMessage="This vendor has no bookings yet."
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === "reject"}
        title="Reject this vendor?"
        message="The vendor will be marked as rejected and won't appear to customers."
        confirmLabel="Reject vendor"
        tone="danger"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "suspend"}
        title="Suspend this vendor?"
        message="A suspended vendor is hidden from customers until reactivated."
        confirmLabel="Suspend vendor"
        tone="danger"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === "reactivate"}
        title="Reactivate this vendor?"
        message="The vendor will be visible to customers again."
        confirmLabel="Reactivate"
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/* ── Overview tab ─────────────────────────────────────────────────────────── */

function OverviewTab({
  vendor,
  tiers,
  onToggleTier,
}: {
  vendor: AdminVendor;
  tiers: VendorTier[];
  onToggleTier: (t: VendorTier) => void;
}) {
  // Real customer ratings, matched to this vendor by name (best-effort).
  const ratings = useVendorRatings();
  const verified = statFor(ratings, { id: vendor.id, name: vendor.business });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Calendar} label="Total Bookings" value={String(vendor.totalBookings)} />
        <StatCard
          icon={StarSolid}
          label="Rating"
          value={String(vendor.rating)}
          sub={
            verified
              ? `${vendor.reviews} seed · ★ ${verified.rating} from ${verified.count} verified`
              : `${vendor.reviews} reviews`
          }
        />
        <StatCard icon={Users} label="Reviews" value={String(vendor.reviews)} />
        <StatCard icon={Wallet} label="From / plate" value={money(vendor.priceFrom)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WidgetCard title="Business Details" className="lg:col-span-2">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Owner" value={vendor.owner} />
            <Detail label="Phone" value={vendor.phone} />
            <Detail label="Email" value={vendor.email} />
            <Detail label="Location" value={`${vendor.city}, ${vendor.state}`} />
            <Detail label="Cuisines" value={vendor.cuisines.join(", ")} />
            <Detail label="Diet" value={vendor.diet} />
            <Detail label="Joined" value={vendor.joinedDate} />
            <Detail label="Vendor ID" value={vendor.id} />
          </dl>
        </WidgetCard>

        <WidgetCard title="Tiers">
          <p className="text-sm text-ink-soft">
            Assign every marketplace tier this vendor serves — a caterer can sit
            in more than one band.
          </p>
          <div className="mt-3">
            <TierBadges tiers={tiers} />
          </div>
          <div className="mt-4 space-y-2">
            {TIER_ORDER.map((t) => {
              const active = tiers.includes(t);
              const last = active && tiers.length === 1;
              return (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-cream-3 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-maroon"
                    checked={active}
                    disabled={last}
                    onChange={() => onToggleTier(t)}
                  />
                  {t}
                </label>
              );
            })}
          </div>
        </WidgetCard>
      </div>
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

/* ── KYC tab ──────────────────────────────────────────────────────────────── */

function KycTab({
  docs,
  onSetDoc,
}: {
  docs: VendorDocument[];
  onSetDoc: (kind: string, status: VerificationStatus) => void;
}) {
  return (
    <WidgetCard title="KYC & Documents">
      <ul className="space-y-3">
        {docs.map((d) => (
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
                onClick={() => onSetDoc(d.kind, "Verified")}
                disabled={d.status === "Verified"}
                className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Verify
              </button>
              <button
                type="button"
                onClick={() => onSetDoc(d.kind, "Rejected")}
                disabled={d.status === "Rejected"}
                className="rounded-full border border-cream-3 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
