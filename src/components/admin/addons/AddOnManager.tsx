"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Field, inputClass, Toggle } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { PlusCircle } from "@/components/admin/shared/icons";
import { catalogAddOns } from "@/lib/admin/mockData";
import type { CatalogAddOn } from "@/lib/admin/types";

const emptyDraft: CatalogAddOn = {
  id: "",
  name: "",
  nameHi: "",
  description: "",
  price: 0,
  perPlate: true,
  active: true,
};

export default function AddOnManager() {
  const [list, setList] = useState<CatalogAddOn[]>(catalogAddOns);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<CatalogAddOn | null>(null);

  const stats = useMemo(
    () => ({
      total: list.length,
      perPlate: list.filter((a) => a.perPlate).length,
      flat: list.filter((a) => !a.perPlate).length,
      active: list.filter((a) => a.active).length,
    }),
    [list],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((a) => !needle || a.name.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle));
  }, [list, q]);

  const toggle = (id: string) =>
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));

  const upsert = (a: CatalogAddOn) => {
    setList((prev) => {
      const exists = prev.some((x) => x.id === a.id);
      return exists ? prev.map((x) => (x.id === a.id ? a : x)) : [{ ...a }, ...prev];
    });
    setDraft(null);
  };

  const editing = Boolean(draft && draft.id);

  const columns: Column<CatalogAddOn>[] = [
    {
      key: "name",
      header: "Add-On",
      cell: (a) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{a.name} <span className="text-xs font-normal text-ink-soft">{a.nameHi}</span></p>
          <p className="text-xs text-ink-soft">{a.description}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (a) => (
        <span className="text-ink">
          {money(a.price)} <span className="text-xs text-ink-soft">{a.perPlate ? "/ plate" : "flat"}</span>
        </span>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (a) => <Toggle checked={a.active} onChange={() => toggle(a.id)} label={`Toggle ${a.name}`} />,
    },
    {
      key: "actions",
      header: "",
      cell: (a) => (
        <button type="button" onClick={() => setDraft(a)} className="text-sm font-semibold text-maroon hover:underline">Edit</button>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Add-On Manager"
        subtitle="Create and price live counters and event extras."
        actions={
          <button type="button" onClick={() => setDraft({ ...emptyDraft })} className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark">
            + New Add-On
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={PlusCircle} label="Total Add-Ons" value={String(stats.total)} />
        <StatCard icon={PlusCircle} label="Per-Plate" value={String(stats.perPlate)} />
        <StatCard icon={PlusCircle} label="Flat Charge" value={String(stats.flat)} />
        <StatCard icon={PlusCircle} label="Active" value={String(stats.active)} />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Search add-ons…" className="lg:max-w-sm" />

      <DataTable columns={columns} rows={visible} getRowKey={(a) => a.id} minWidthClass="min-w-[620px]" empty={<EmptyState title="No add-ons found" />} />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={editing ? "Edit Add-On" : "New Add-On"}
        footer={
          draft && (
            <>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2">Cancel</button>
              <button
                type="button"
                onClick={() => upsert({ ...draft, id: draft.id || `addon-${Date.now()}` })}
                disabled={!draft.name.trim()}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editing ? "Save changes" : "Create add-on"}
              </button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name (EN)"><input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Pan Counter" /></Field>
              <Field label="Name (HI)"><input className={inputClass} value={draft.nameHi} onChange={(e) => setDraft({ ...draft, nameHi: e.target.value })} placeholder="पान काउंटर" /></Field>
            </div>
            <Field label="Description"><input className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Live paan with assorted fillings." /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Price (₹)"><input type="number" min={0} className={inputClass} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <Toggle checked={draft.perPlate} onChange={(v) => setDraft({ ...draft, perPlate: v })} label="Per plate" />
                  Per plate
                </label>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Active" />
                  Active
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
