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
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { Ticket } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import type { AdminCoupon, CouponStatus } from "@/lib/admin/types";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
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
  status: "Active",
};

export default function CouponManager() {
  const [list, setList] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [draft, setDraft] = useState<AdminCoupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load coupons from the API (seeded from the former mock list server-side).
  useEffect(() => {
    let active = true;
    fetch("/api/coupons?pageSize=1000", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.data) setList(json.data as AdminCoupon[]);
      })
      .catch(() => {
        if (active) setError("Couldn't load coupons.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      active: list.filter((c) => c.status === "Active").length,
      inactive: list.filter((c) => c.status === "Inactive").length,
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

  // Create (POST) or update (PATCH) via the API, then reflect the server's copy.
  const save = async (c: AdminCoupon) => {
    setSaving(true);
    setError("");
    const editing = Boolean(c.id);
    const payload = {
      code: c.code,
      label: c.label,
      percent: c.percent,
      cap: c.cap,
      eligibility: c.eligibility,
      startsAt: c.startsAt,
      expiresAt: c.expiresAt,
      status: c.status,
    };
    try {
      const res = await fetch(
        editing ? `/api/coupons/${encodeURIComponent(c.id)}` : "/api/coupons",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { coupon?: AdminCoupon; error?: string }
        | null;
      if (!res.ok || !json?.coupon) {
        setError(json?.error ?? "Couldn't save the coupon.");
        return;
      }
      const saved = json.coupon;
      setList((prev) =>
        prev.some((x) => x.id === saved.id)
          ? prev.map((x) => (x.id === saved.id ? saved : x))
          : [saved, ...prev],
      );
      setDraft(null);
    } catch {
      setError("Couldn't save the coupon. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteId(null);
    const prev = list;
    setList((cur) => cur.filter((c) => c.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev); // rollback
      setError("Couldn't delete the coupon.");
    }
  };

  const columns: Column<AdminCoupon>[] = [
    {
      key: "code",
      header: "Coupon",
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-semibold tracking-wide text-maroon">{c.code}</p>
          <p className="text-xs text-ink-soft">{c.label}</p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", cell: (c) => <span className="text-ink">{c.percent}% · up to {money(c.cap)}</span> },
    { key: "validity", header: "Validity", cell: (c) => <span className="text-ink-soft">{c.startsAt || "—"} → {c.expiresAt || "—"}</span> },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDraft(c)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>Delete</Button>
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
          <Button variant="primary" onClick={() => setDraft({ ...emptyDraft })}>
            + New Coupon
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-maroon bg-maroon/10 px-4 py-3 text-sm font-medium text-maroon">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Ticket} label="Active" value={String(stats.active)} />
        <StatCard icon={Ticket} label="Inactive" value={String(stats.inactive)} />
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
        empty={
          <EmptyState
            title={loading ? "Loading coupons…" : "No coupons found"}
            message={
              loading
                ? "Fetching the latest coupons."
                : "Create a coupon or adjust your filters."
            }
          />
        }
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
              <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => save({ ...draft, code: draft.code.toUpperCase() })}
                disabled={saving || !draft.code.trim() || !draft.label.trim()}
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create coupon"}
              </Button>
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
            <Field label="Status">
              <SelectFilter
                label="Status"
                value={draft.status}
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Inactive", value: "Inactive" },
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
