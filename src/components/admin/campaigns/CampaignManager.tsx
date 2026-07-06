"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import ImageField from "@/components/admin/shared/ImageField";
import { Rocket } from "@/components/admin/shared/icons";
import { isUnoptimized } from "@/lib/homeContent";
import type { AdminCampaign, CampaignStatus } from "@/lib/admin/types";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

const emptyDraft: AdminCampaign = {
  id: "",
  name: "",
  image: "",
  linkUrl: "",
  status: "Active",
};

export default function CampaignManager() {
  const [list, setList] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [draft, setDraft] = useState<AdminCampaign | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load campaigns from the API.
  useEffect(() => {
    let active = true;
    fetch("/api/campaigns", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.data) setList(json.data as AdminCampaign[]);
      })
      .catch(() => {
        if (active) setError("Couldn't load campaigns.");
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
      const matchesQ = !needle || c.name.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || c.status === status;
      return matchesQ && matchesStatus;
    });
  }, [list, q, status]);

  // Create (POST) or update (PATCH) via the API, then reflect the server's copy.
  const save = async (c: AdminCampaign) => {
    setSaving(true);
    setError("");
    const editing = Boolean(c.id);
    const payload = {
      name: c.name,
      image: c.image,
      linkUrl: c.linkUrl,
      status: c.status,
    };
    try {
      const res = await fetch(
        editing
          ? `/api/campaigns/${encodeURIComponent(c.id)}`
          : "/api/campaigns",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { campaign?: AdminCampaign; error?: string }
        | null;
      if (!res.ok || !json?.campaign) {
        setError(json?.error ?? "Couldn't save the campaign.");
        return;
      }
      const saved = json.campaign;
      setList((prev) =>
        prev.some((x) => x.id === saved.id)
          ? prev.map((x) => (x.id === saved.id ? saved : x))
          : [saved, ...prev],
      );
      setDraft(null);
    } catch {
      setError("Couldn't save the campaign. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteId(null);
    const prev = list;
    setList((cur) => cur.filter((c) => c.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev); // rollback
      setError("Couldn't delete the campaign.");
    }
  };

  const columns: Column<AdminCampaign>[] = [
    {
      key: "campaign",
      header: "Campaign",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md border border-cream-3 bg-cream/40">
            {c.image ? (
              <Image
                src={c.image}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={isUnoptimized(c.image)}
              />
            ) : null}
          </div>
          <p className="min-w-0 truncate font-semibold text-maroon">{c.name}</p>
        </div>
      ),
    },
    {
      key: "link",
      header: "Links to",
      cell: (c) => (
        <span className="text-ink-soft">{c.linkUrl || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraft(c)}
            className="text-sm font-semibold text-maroon hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(c.id)}
            className="text-sm font-semibold text-ink-soft hover:underline"
          >
            Delete
          </button>
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
        title="Campaigns"
        subtitle="Upload a picture to run a popup on the home page. The most recent Active campaign is shown to every visitor."
        actions={
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
          >
            + New Campaign
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-maroon bg-maroon/10 px-4 py-3 text-sm font-medium text-maroon">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Rocket} label="Active" value={String(stats.active)} />
        <StatCard icon={Rocket} label="Inactive" value={String(stats.inactive)} />
        <StatCard icon={Rocket} label="Total Campaigns" value={String(stats.total)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search by name…"
          className="lg:max-w-sm lg:flex-1"
        />
        <SelectFilter
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
      </div>

      <DataTable
        columns={columns}
        rows={visible}
        getRowKey={(c) => c.id}
        empty={
          <EmptyState
            title={loading ? "Loading campaigns…" : "No campaigns yet"}
            message={
              loading
                ? "Fetching your campaigns."
                : "Create a campaign to run an image popup on the home page."
            }
          />
        }
      />

      {/* Create / edit */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={editing ? "Edit Campaign" : "New Campaign"}
        size="lg"
        footer={
          draft && (
            <>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save(draft)}
                disabled={saving || !draft.name.trim() || !draft.image.trim()}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create campaign"}
              </button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Campaign name">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Diwali Feast Offer"
              />
            </Field>

            <ImageField
              label="Popup image"
              value={draft.image}
              onChange={(next) => setDraft({ ...draft, image: next })}
              hint="Upload or paste an image URL"
            />

            <Field label="Link to (optional)" hint="Where the picture takes visitors when tapped. Leave blank for a non-clickable popup.">
              <input
                className={inputClass}
                value={draft.linkUrl}
                onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                placeholder="/packages or https://…"
              />
            </Field>

            <Field label="Status">
              <SelectFilter
                label="Status"
                value={draft.status}
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Inactive", value: "Inactive" },
                ]}
                onChange={(v) =>
                  setDraft({ ...draft, status: v as CampaignStatus })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this campaign?"
        message="This campaign will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => deleteId && remove(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
