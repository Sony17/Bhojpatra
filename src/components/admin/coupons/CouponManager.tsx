"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { Ticket } from "@/components/admin/shared/icons";
import { adminCoupons } from "@/lib/admin/mockData";
import type { AdminCoupon, CouponStatus } from "@/lib/admin/types";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Scheduled", value: "Scheduled" },
  { label: "Expired", value: "Expired" },
];

const emptyDraft: AdminCoupon = {
  id: "",
  code: "",
  label: "",
  percent: 10,
  cap: 5000,
  eligibility: "All occasions",
  startsAt: "",
  expiresAt: "",
  usageLimit: 500,
  usedCount: 0,
  status: "Active",
};

export default function CouponManager() {
  const [list, setList] = useState<AdminCoupon[]>(adminCoupons);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [draft, setDraft] = useState<AdminCoupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      active: list.filter((c) => c.status === "Active").length,
      scheduled: list.filter((c) => c.status === "Scheduled").length,
      redemptions: list.reduce((s, c) => s + c.usedCount, 0),
      total: list.length,
    }),
    [list],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      const matchesQ = !needle || c.code.toLowerCase().includes(needle) || c.label.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || c.status === status;
      return matchesQ && matchesStatus;
    });
  }, [list, q, status]);

  const upsert = (c: AdminCoupon) => {
    setList((prev) => {
      const exists = prev.some((x) => x.id === c.id);
      return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [{ ...c }, ...prev];
    });
    setDraft(null);
  };

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
  };

  const columns: Column<AdminCoupon>[] = [
    {
      key: "code",
      header: "Coupon",
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-mono font-semibold text-maroon">{c.code}</p>
          <p className="text-xs text-ink-soft">{c.label}</p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", cell: (c) => <span className="text-ink">{c.percent}% · up to {money(c.cap)}</span> },
    { key: "usage", header: "Usage", cell: (c) => <span className="text-ink-soft">{c.usedCount} / {c.usageLimit}</span> },
    { key: "validity", header: "Validity", cell: (c) => <span className="text-ink-soft">{c.startsAt || "—"} → {c.expiresAt || "—"}</span> },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setDraft(c)} className="text-sm font-semibold text-maroon hover:underline">Edit</button>
          <button type="button" onClick={() => setDeleteId(c.id)} className="text-sm font-semibold text-ink-soft hover:underline">Delete</button>
        </div>
      ),
      className: "text-right",
    },
  ];

  const editing = Boolean(draft && draft.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Discount & Coupons"
        subtitle="Create discount rules and track their usage."
        actions={
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
          >
            + New Coupon
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Ticket} label="Active" value={String(stats.active)} />
        <StatCard icon={Ticket} label="Scheduled" value={String(stats.scheduled)} />
        <StatCard icon={Ticket} label="Total Redemptions" value={String(stats.redemptions)} />
        <StatCard icon={Ticket} label="Total Coupons" value={String(stats.total)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar value={q} onChange={setQ} placeholder="Search by code or label…" className="lg:max-w-sm lg:flex-1" />
        <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
      </div>

      <DataTable
        columns={columns}
        rows={visible}
        getRowKey={(c) => c.id}
        empty={<EmptyState title="No coupons found" message="Create a coupon or adjust your filters." />}
      />

      {/* Create / edit */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={editing ? "Edit Coupon" : "New Coupon"}
        size="lg"
        footer={
          draft && (
            <>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2">Cancel</button>
              <button
                type="button"
                onClick={() => upsert({ ...draft, id: draft.id || `CPN-${Date.now()}`, code: draft.code.toUpperCase() })}
                disabled={!draft.code.trim() || !draft.label.trim()}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editing ? "Save changes" : "Create coupon"}
              </button>
            </>
          )
        }
      >
        {draft && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Code">
              <input className={inputClass} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="BHOJ10" />
            </Field>
            <Field label="Eligibility">
              <input className={inputClass} value={draft.eligibility} onChange={(e) => setDraft({ ...draft, eligibility: e.target.value })} placeholder="All occasions" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Label">
                <input className={inputClass} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="10% off, up to ₹5,000" />
              </Field>
            </div>
            <Field label="Discount %">
              <input type="number" min={1} max={100} className={inputClass} value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) })} />
            </Field>
            <Field label="Max Cap (₹)">
              <input type="number" min={0} className={inputClass} value={draft.cap} onChange={(e) => setDraft({ ...draft, cap: Number(e.target.value) })} />
            </Field>
            <Field label="Starts">
              <input className={inputClass} value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} placeholder="01 Jul 2026" />
            </Field>
            <Field label="Expires">
              <input className={inputClass} value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} placeholder="31 Dec 2026" />
            </Field>
            <Field label="Usage Limit">
              <input type="number" min={0} className={inputClass} value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: Number(e.target.value) })} />
            </Field>
            <Field label="Status">
              <SelectFilter
                label="Status"
                value={draft.status}
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Scheduled", value: "Scheduled" },
                  { label: "Expired", value: "Expired" },
                ]}
                onChange={(v) => setDraft({ ...draft, status: v as CouponStatus })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this coupon?"
        message="This coupon will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => deleteId && remove(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
