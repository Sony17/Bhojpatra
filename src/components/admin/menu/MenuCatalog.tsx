"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import { Toggle } from "@/components/admin/shared/FormControls";
import { Utensils, PlusCircle } from "@/components/admin/shared/icons";
import { catalogCuisines, catalogDishes, catalogPackages } from "@/lib/admin/mockData";
import type { CatalogCuisine, CatalogDish, CatalogPackage } from "@/lib/admin/types";

const TABS: TabItem[] = [
  { id: "cuisines", label: "Cuisines" },
  { id: "dishes", label: "Dishes" },
  { id: "packages", label: "Packages" },
];

const PAGE_SIZE = 8;

export default function MenuCatalog() {
  const [tab, setTab] = useState("cuisines");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Menu & Catalog"
        subtitle="Manage the cuisines, dishes and packages the customer site reads from."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Utensils} label="Cuisines" value={String(catalogCuisines.length)} />
        <StatCard icon={Utensils} label="Dishes" value={String(catalogDishes.length)} />
        <StatCard icon={PlusCircle} label="Packages" value={String(catalogPackages.length)} />
        <StatCard icon={PlusCircle} label="Add-Ons" value="7" sub="Managed separately" href="/admin/add-ons" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "cuisines" && <CuisinesTab />}
      {tab === "dishes" && <DishesTab />}
      {tab === "packages" && <PackagesTab />}
    </div>
  );
}

/* ── Cuisines ─────────────────────────────────────────────────────────────── */

function CuisinesTab() {
  const [rows, setRows] = useState<CatalogCuisine[]>(catalogCuisines);
  const toggle = (id: string) =>
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

  const columns: Column<CatalogCuisine>[] = [
    {
      key: "name",
      header: "Cuisine",
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{c.name}</p>
          <p className="text-xs text-ink-soft">{c.nameHi}</p>
        </div>
      ),
    },
    { key: "dishes", header: "Dishes", cell: (c) => <span className="text-ink-soft">{c.dishes}</span> },
    {
      key: "visible",
      header: "Visible",
      cell: (c) => <Toggle checked={c.visible} onChange={() => toggle(c.id)} label={`Toggle ${c.name}`} />,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return <DataTable columns={columns} rows={rows} getRowKey={(c) => c.id} minWidthClass="min-w-[480px]" empty={<EmptyState title="No cuisines" />} />;
}

/* ── Dishes ───────────────────────────────────────────────────────────────── */

function DishesTab() {
  const [rows, setRows] = useState<CatalogDish[]>(catalogDishes);
  const [q, setQ] = useState("");
  const [diet, setDiet] = useState("All");
  const [page, setPage] = useState(1);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const toggle = (id: string) =>
    setRows((prev) => prev.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)));

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((d) => {
      const matchesQ = !needle || d.name.toLowerCase().includes(needle) || d.cuisine.toLowerCase().includes(needle);
      const matchesDiet = diet === "All" || d.diet === diet;
      return matchesQ && matchesDiet;
    });
  }, [rows, q, diet]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<CatalogDish>[] = [
    { key: "name", header: "Dish", cell: (d) => <span className="font-medium text-ink">{d.name}</span> },
    { key: "course", header: "Course", cell: (d) => <span className="text-ink-soft">{d.course}</span> },
    { key: "cuisine", header: "Cuisine", cell: (d) => <span className="text-ink-soft">{d.cuisine}</span> },
    {
      key: "diet",
      header: "Diet",
      cell: (d) => (
        <span className={"inline-flex items-center gap-1.5 text-sm " + (d.diet === "veg" ? "text-ink-soft" : "text-maroon")}>
          <span className={"h-2 w-2 rounded-full " + (d.diet === "veg" ? "bg-ink-soft" : "bg-maroon")} />
          {d.diet === "veg" ? "Veg" : "Non-Veg"}
        </span>
      ),
    },
    {
      key: "visible",
      header: "Visible",
      cell: (d) => <Toggle checked={d.visible} onChange={() => toggle(d.id)} label={`Toggle ${d.name}`} />,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar value={q} onChange={onFilter(setQ)} placeholder="Search dishes…" className="lg:max-w-sm lg:flex-1" />
        <SelectFilter
          label="Diet"
          value={diet}
          options={[
            { label: "All Diets", value: "All" },
            { label: "Veg", value: "veg" },
            { label: "Non-Veg", value: "non-veg" },
          ]}
          onChange={onFilter(setDiet)}
        />
      </div>

      <DataTable columns={columns} rows={paged} getRowKey={(d) => d.id} minWidthClass="min-w-[620px]" empty={<EmptyState title="No dishes found" message="Try a different search or filter." />} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onPageChange={setPage} />
    </div>
  );
}

/* ── Packages ─────────────────────────────────────────────────────────────── */

function PackagesTab() {
  const [rows, setRows] = useState<CatalogPackage[]>(catalogPackages);
  const toggle = (id: string) =>
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));

  const columns: Column<CatalogPackage>[] = [
    {
      key: "name",
      header: "Package",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{p.name}</span>
          {p.popular && <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-cream">Popular</span>}
        </div>
      ),
    },
    { key: "price", header: "Price", cell: (p) => <span className="font-display font-semibold text-ink">{p.price} <span className="text-xs font-normal text-ink-soft">{p.unit}</span></span> },
    { key: "features", header: "Features", cell: (p) => <span className="text-ink-soft">{p.features} items</span> },
    {
      key: "visible",
      header: "Visible",
      cell: (p) => <Toggle checked={p.visible} onChange={() => toggle(p.id)} label={`Toggle ${p.name}`} />,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return <DataTable columns={columns} rows={rows} getRowKey={(p) => p.id} minWidthClass="min-w-[520px]" empty={<EmptyState title="No packages" />} />;
}
