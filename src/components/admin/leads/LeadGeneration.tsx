"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import LoadingSkeleton from "@/components/admin/shared/LoadingSkeleton";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { Megaphone, Users, Calendar } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";

/** One captured lead — mirrors the `Lead` shape from `/api/leads`. */
interface Lead {
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  /** Set for support-chat "Request a callback" leads. */
  topic?: string;
  note?: string;
}

const PAGE_SIZE = 10;

/** Human-friendly label for the `source` field a lead was captured from. */
const SOURCE_LABELS: Record<string, string> = {
  "home-promo": "Home — Promo Offers",
  "booking-intent": "Booking Intent",
  "home-booking-form": "Home — Booking Form",
  "support-callback": "Support — Callback",
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

/** A callback lead keys on a `cb:`+phone sentinel, so its `email` field is not
 *  a real address — only render a mailto when it actually looks like one. */
function realEmail(email: string): string {
  return email.includes("@") ? email : "";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isThisMonth(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

export default function LeadGeneration() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as { leads?: Lead[] };
        if (active) setLeads(data.leads ?? []);
      } catch {
        if (active) {
          setError(true);
          setLeads([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const all = leads ?? [];
    return {
      total: all.length,
      thisMonth: all.filter((l) => isThisMonth(l.createdAt)).length,
      sources: new Set(all.map((l) => l.source)).size,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const all = leads ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (l) =>
        realEmail(l.email).toLowerCase().includes(term) ||
        l.phone.includes(term) ||
        (l.topic ?? "").toLowerCase().includes(term) ||
        sourceLabel(l.source).toLowerCase().includes(term),
    );
  }, [leads, q]);

  const total = filtered.length;
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const onSearch = (v: string) => {
    setQ(v);
    setPage(1);
  };

  const handleExport = () => {
    exportCsv(
      "bhojpatra-leads.csv",
      filtered.map((l) => ({
        Email: realEmail(l.email),
        Phone: l.phone,
        Source: sourceLabel(l.source),
        Topic: l.topic ?? "",
        Details: l.note ?? "",
        "Captured At": formatDateTime(l.createdAt),
      })),
    );
  };

  const columns: Column<Lead>[] = [
    {
      key: "email",
      header: "Email",
      cell: (l) => {
        const email = realEmail(l.email);
        return email ? (
          <a
            href={`mailto:${email}`}
            className="font-medium text-maroon hover:underline"
          >
            {email}
          </a>
        ) : (
          <span className="text-ink-soft">—</span>
        );
      },
    },
    {
      key: "phone",
      header: "Phone",
      cell: (l) => (
        <a href={`tel:${l.phone}`} className="text-ink hover:underline">
          +91 {l.phone}
        </a>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (l) => <span className="text-ink-soft">{sourceLabel(l.source)}</span>,
    },
    {
      key: "topic",
      header: "Topic",
      cell: (l) =>
        l.topic ? (
          <span className="text-ink" title={l.note || undefined}>
            {l.topic}
            {l.note ? " *" : ""}
          </span>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Captured At",
      cell: (l) => (
        <span className="text-ink-soft">{formatDateTime(l.createdAt)}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  if (leads === null) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Lead Generation"
        subtitle="Contacts captured from promo sign-ups, booking intent and support-chat callback requests."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-card border border-maroon/30 bg-cream-2 px-4 py-3 text-sm text-maroon"
        >
          Couldn&apos;t load leads. Please refresh the page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Megaphone} label="Total Leads" value={String(stats.total)} />
        <StatCard icon={Calendar} label="This Month" value={String(stats.thisMonth)} />
        <StatCard icon={Users} label="Sources" value={String(stats.sources)} />
      </div>

      <SearchBar
        value={q}
        onChange={onSearch}
        placeholder="Search by email, phone or source…"
        className="lg:max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(l) => `${l.email}-${l.phone}-${l.createdAt}`}
        minWidthClass="min-w-[760px]"
        empty={
          <EmptyState
            title={q ? "No matching leads" : "No leads yet"}
            message={
              q
                ? "Try a different search term."
                : "Leads will appear here as visitors sign up for promotional offers on the home page."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
