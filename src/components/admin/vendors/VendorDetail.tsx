"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import TierBadges from "@/components/admin/shared/TierBadges";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import EmptyState from "@/components/admin/shared/EmptyState";
import { money } from "@/components/admin/shared/money";
import BookingsMiniTable from "@/components/admin/bookings/BookingsMiniTable";
import PushToTopFiveButton from "@/components/admin/vendors/PushToTopFiveButton";
import { Calendar, StarSolid, Users, Wallet } from "@/components/admin/shared/icons";
import { getBookingsByVendor } from "@/lib/admin/mockData";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import {
  sortTiers,
  type AdminVendor,
  type VendorDocument,
} from "@/lib/admin/types";

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "kyc", label: "KYC & Documents" },
  { id: "menu", label: "Menu" },
  { id: "bookings", label: "Bookings" },
];

/**
 * Vendor detail page. Shows the vendor's profile, tiers, KYC documents and
 * bookings as looked up by the route. Verification and status changes are made
 * in the Vendor Approvals console, which persists them — the only action here
 * is "Push to Top 5", which pins the vendor into the /book menu-builder
 * vendor ribbon through the shared top-vendors store (nothing silently
 * no-ops). Renders a friendly not-found state for bad ids.
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
            <Button href="/admin/vendors" variant="primary">
              Back to Vendors
            </Button>
          }
        />
      </div>
    );
  }

  return <VendorDetailView vendor={vendor} />;
}

function VendorDetailView({ vendor }: { vendor: AdminVendor }) {
  const [tab, setTab] = useState("overview");
  const tiers = sortTiers(vendor.tiers);

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
      />

      {/* Status row */}
      <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <TierBadges tiers={tiers} />
        <StatusBadge status={vendor.status} />
        {vendor.suspended && <StatusBadge status="Suspended" />}
        <span className="ml-auto pl-2">
          <PushToTopFiveButton vendor={vendor} />
        </span>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && <OverviewTab vendor={vendor} tiers={tiers} />}
      {tab === "kyc" && <KycTab docs={vendor.documents} />}
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
    </div>
  );
}

/* ── Overview tab ─────────────────────────────────────────────────────────── */

function OverviewTab({
  vendor,
  tiers,
}: {
  vendor: AdminVendor;
  tiers: AdminVendor["tiers"];
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
            Marketplace tiers this vendor serves. Tiers are assigned during
            review in Vendor Approvals.
          </p>
          <div className="mt-3">
            <TierBadges tiers={tiers} />
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

function KycTab({ docs }: { docs: VendorDocument[] }) {
  return (
    <WidgetCard title="KYC & Documents">
      <ul className="space-y-3">
        {docs.map((d) => (
          <li
            key={d.kind}
            className="flex flex-col gap-3 rounded-xl border border-cream-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
                <p className="font-medium text-ink">{d.kind}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="mt-0.5 text-sm tabular-nums tracking-wide text-ink-soft">{d.number}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
