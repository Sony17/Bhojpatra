"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Field } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { Share, Trophy, Calendar, Wallet } from "@/components/admin/shared/icons";
import { PARTNER_ROLE_LABEL } from "@/lib/referral";
import ReferralRatesCard from "@/components/admin/referrals/ReferralRatesCard";
import {
  DEFAULT_REFERRAL_RATES,
  referrerPercentFor,
  type ReferralRates,
} from "@/lib/referralRates";
import type { PartnerRole } from "@/lib/session";
import type { BookingStatus } from "@/lib/data";
import { Button } from "@/components/ui";

/* ── Data shapes (mirror the /api/partners and /api/bookings responses) ───── */

interface Partner {
  code: string;
  name: string;
  type: PartnerRole;
  businessName?: string;
  phone?: string;
  email?: string;
  city?: string;
  createdAt: string;
}

interface ReferredOrder {
  id: string;
  customer: string;
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
  amount: number;
  paid: number;
  status: BookingStatus;
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
}

/** A referrer plus their rolled-up performance — one leaderboard row. */
interface LeaderRow {
  code: string;
  name: string;
  type: PartnerRole;
  city?: string;
  phone?: string;
  email?: string;
  /** True when this code only exists on orders (no signed-up partner record). */
  unregistered: boolean;
  total: number;
  confirmed: number;
  pending: number;
  referredValue: number;
  /** Referred value from confirmed/completed orders only — the reward base. */
  confirmedValue: number;
  orders: ReferredOrder[];
}

const isConfirmed = (s: BookingStatus) => s === "Confirmed" || s === "Completed";

const isPartnerRole = (v: unknown): v is PartnerRole =>
  v === "planner" || v === "individual" || v === "venue";

const TYPE_OPTIONS = [
  { label: "All Referrers", value: "All" },
  { label: PARTNER_ROLE_LABEL.planner, value: "planner" },
  { label: PARTNER_ROLE_LABEL.individual, value: "individual" },
  { label: PARTNER_ROLE_LABEL.venue, value: "venue" },
];

/** Brand-token pill for the partner type (Event Planner / Individual / Venue). */
function TypeBadge({ type }: { type: PartnerRole }) {
  const cls =
    type === "planner"
      ? "bg-maroon text-cream"
      : type === "venue"
        ? "bg-cream-2 text-ink"
        : "border border-maroon text-maroon";
  return (
    <span
      className={
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold " +
        cls
      }
    >
      {PARTNER_ROLE_LABEL[type]}
    </span>
  );
}

/**
 * Admin Referrals console. Joins the registered partners (`/api/partners`) with
 * every referred order (`/api/bookings`, tagged with the partner's code at
 * confirm time) into a leaderboard of who's driving bookings — Event Planners,
 * Individual Referrers and Venue Owners. Live data, fetched client-side, so it
 * mirrors what each partner sees on their own dashboard.
 */
export default function ReferralManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [orders, setOrders] = useState<ReferredOrder[]>([]);
  const [rates, setRates] = useState<ReferralRates>(DEFAULT_REFERRAL_RATES);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [selected, setSelected] = useState<LeaderRow | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/partners").then((r) => (r.ok ? r.json() : { partners: [] })),
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : { orders: [] })),
      fetch("/api/admin/referral-settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, b, s]) => {
        if (!active) return;
        setPartners((p?.partners ?? []) as Partner[]);
        setOrders((b?.orders ?? []) as ReferredOrder[]);
        if (s) setRates(s as ReferralRates);
      })
      .catch(() => {
        /* offline — fall through to the empty state */
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Build one leaderboard row per referral code: seed from registered partners,
  // then fold in every referred order. Orders whose code has no partner record
  // still surface (a partner who hasn't signed up, or seed data) so no referred
  // revenue is hidden.
  const rows = useMemo(() => {
    const byCode = new Map<string, LeaderRow>();
    for (const p of partners) {
      byCode.set(p.code, {
        code: p.code,
        name: p.name,
        type: p.type,
        city: p.city,
        phone: p.phone,
        email: p.email,
        unregistered: false,
        total: 0,
        confirmed: 0,
        pending: 0,
        referredValue: 0,
        confirmedValue: 0,
        orders: [],
      });
    }
    for (const o of orders) {
      const code = o.referralCode;
      if (!code) continue;
      let row = byCode.get(code);
      if (!row) {
        row = {
          code,
          name: o.referrerName?.trim() || code,
          type: isPartnerRole(o.referrerType) ? o.referrerType : "individual",
          unregistered: true,
          total: 0,
          confirmed: 0,
          pending: 0,
          referredValue: 0,
          confirmedValue: 0,
          orders: [],
        };
        byCode.set(code, row);
      }
      row.orders.push(o);
      row.total += 1;
      row.referredValue += o.amount;
      if (isConfirmed(o.status)) {
        row.confirmed += 1;
        row.confirmedValue += o.amount;
      } else if (o.status === "Pending") row.pending += 1;
    }
    return [...byCode.values()].sort(
      (a, b) => b.referredValue - a.referredValue || b.total - a.total,
    );
  }, [partners, orders]);

  const summary = useMemo(() => {
    const referred = rows.reduce((s, r) => s + r.total, 0);
    return {
      referrers: rows.length,
      planners: rows.filter((r) => r.type === "planner").length,
      individuals: rows.filter((r) => r.type === "individual").length,
      referred,
      confirmed: rows.reduce((s, r) => s + r.confirmed, 0),
      referredValue: rows.reduce((s, r) => s + r.referredValue, 0),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !needle ||
        r.name.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle);
      const matchesType = type === "All" || r.type === type;
      return matchesQ && matchesType;
    });
  }, [rows, q, type]);

  // Referrer's estimated reward: the configured % for their partner type,
  // applied to confirmed referred value. Venue / unregistered types get 0.
  const rewardFor = (r: LeaderRow): number =>
    Math.round((r.confirmedValue * referrerPercentFor(rates, r.type)) / 100);

  const onExport = () =>
    exportCsv(
      "bhojpatra-referrals.csv",
      filtered.map((r) => ({
        Code: r.code,
        Referrer: r.name,
        Type: PARTNER_ROLE_LABEL[r.type],
        City: r.city ?? "",
        "Referred Bookings": r.total,
        Confirmed: r.confirmed,
        "Referred Value": r.referredValue,
        "Reward (est.)": rewardFor(r),
      })),
    );

  const columns: Column<LeaderRow>[] = [
    {
      key: "rank",
      header: "#",
      cell: (r) => {
        const rank = filtered.indexOf(r) + 1;
        return (
          <span
            className={
              "font-display font-bold " +
              (rank <= 3 ? "text-maroon" : "text-ink-soft")
            }
          >
            {rank}
          </span>
        );
      },
      className: "w-10",
    },
    {
      key: "referrer",
      header: "Referrer",
      cell: (r) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-ink">
            {r.name}
            {r.unregistered && (
              <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                Unregistered
              </span>
            )}
          </p>
          <p className="font-display text-xs tracking-wider text-maroon">{r.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (r) => <TypeBadge type={r.type} /> },
    {
      key: "total",
      header: "Referred",
      cell: (r) => <span className="text-ink">{r.total}</span>,
    },
    {
      key: "confirmed",
      header: "Confirmed",
      cell: (r) => <span className="text-ink">{r.confirmed}</span>,
    },
    {
      key: "value",
      header: "Referred Value",
      cell: (r) => (
        <span className="font-display font-semibold text-ink">
          {money(r.referredValue)}
        </span>
      ),
      className: "whitespace-nowrap text-right",
      headerClassName: "text-right",
    },
    {
      key: "reward",
      header: "Reward (est.)",
      cell: (r) => {
        const reward = rewardFor(r);
        return reward > 0 ? (
          <span className="font-display font-semibold text-maroon">
            {money(reward)}
          </span>
        ) : (
          <span className="text-ink-soft">—</span>
        );
      },
      className: "whitespace-nowrap text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Referrals"
        subtitle="Track who's driving bookings — Event Planners, Individual Referrers and Venue Owners."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Share}
          label="Referrers"
          value={String(summary.referrers)}
          sub={`${summary.planners} planners · ${summary.individuals} individual`}
        />
        <StatCard
          icon={Trophy}
          label="Referred Bookings"
          value={String(summary.referred)}
          sub={rows[0] ? `Top: ${rows[0].name}` : "No referrals yet"}
        />
        <StatCard
          icon={Calendar}
          label="Confirmed"
          value={String(summary.confirmed)}
          sub={`of ${summary.referred} referred`}
        />
        <StatCard
          icon={Wallet}
          label="Referred Value"
          value={money(summary.referredValue)}
          sub="total booking value"
        />
      </div>

      <ReferralRatesCard onSaved={setRates} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by referrer name or code…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.code}
        onRowClick={(r) => setSelected(r)}
        minWidthClass="min-w-[780px]"
        empty={
          <EmptyState
            title={loading ? "Loading referrals…" : "No referrers yet"}
            message={
              loading
                ? "Fetching partners and referred bookings."
                : "Referrers appear here once partners sign up and share their codes."
            }
          />
        }
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : "Referrer"}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <TypeBadge type={selected.type} />
              <span className="font-display text-sm tracking-wider text-maroon">
                {selected.code}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryStat label="Referred" value={String(selected.total)} />
              <SummaryStat label="Confirmed" value={String(selected.confirmed)} />
              <SummaryStat label="Referred Value" value={money(selected.referredValue)} />
              <SummaryStat
                label={`Reward · ${referrerPercentFor(rates, selected.type)}%`}
                value={money(rewardFor(selected))}
              />
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Email">
                <p className="text-sm text-ink">{selected.email ?? "—"}</p>
              </Field>
              <Field label="Phone">
                <p className="text-sm text-ink">{selected.phone ?? "—"}</p>
              </Field>
              <Field label="City">
                <p className="text-sm text-ink">{selected.city ?? "—"}</p>
              </Field>
              <Field label="Status">
                <p className="text-sm text-ink">
                  {selected.unregistered ? "Unregistered code" : "Registered partner"}
                </p>
              </Field>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Referred Bookings
              </p>
              <DataTable
                bare
                columns={orderColumns}
                rows={selected.orders}
                getRowKey={(o) => o.id}
                minWidthClass="min-w-[520px]"
                empty={
                  <EmptyState
                    title="No bookings yet"
                    message="No feasts have been booked with this code so far."
                  />
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const orderColumns: Column<ReferredOrder>[] = [
  {
    key: "booking",
    header: "Booking",
    cell: (o) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{o.customer}</p>
        <p className="text-xs text-ink-soft">
          {o.occasion} · {o.id}
        </p>
      </div>
    ),
  },
  { key: "date", header: "Date", cell: (o) => <span className="text-ink-soft">{o.date}</span> },
  {
    key: "amount",
    header: "Value",
    cell: (o) => (
      <span className="font-display font-semibold text-ink">{money(o.amount)}</span>
    ),
    className: "whitespace-nowrap text-right",
    headerClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (o) => <StatusBadge status={o.status} />,
    className: "whitespace-nowrap text-right",
    headerClassName: "text-right",
  },
];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
