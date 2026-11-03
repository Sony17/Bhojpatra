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
import { Mail, Users, Calendar } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";

/** One captured enquiry — mirrors the `EnquiryRecord` shape from `/api/contact`. */
interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  createdAt: string;
  /** Menu & budget PDF attached to a home-page custom-package request. */
  documentUrl?: string;
  documentName?: string;
  packageId?: string;
  packageName?: string;
  city?: string;
  occasion?: string;
  eventDate?: string;
  guests?: number;
  venue?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  "contact-page": "Contact page",
  "custom-package": "Custom package",
  "feast-package-interest": "Feast package",
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

function SourceBadge({ source }: { source: string }) {
  const label = sourceLabel(source);
  const feast = source === "feast-package-interest";
  return (
    <span
      className={
        feast
          ? "inline-flex rounded-full bg-maroon/10 px-2 py-0.5 text-[11px] font-semibold text-maroon"
          : "inline-flex rounded-full bg-cream-2 px-2 py-0.5 text-[11px] font-medium text-ink/70"
      }
    >
      {label}
    </span>
  );
}

const PAGE_SIZE = 10;

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

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/contact", { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as { enquiries?: Enquiry[] };
        if (active) setEnquiries(data.enquiries ?? []);
      } catch {
        if (active) {
          setError(true);
          setEnquiries([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const all = enquiries ?? [];
    return {
      total: all.length,
      thisMonth: all.filter((e) => isThisMonth(e.createdAt)).length,
      contacts: new Set(
        all.map((e) => e.email.toLowerCase() || e.phone).filter(Boolean),
      ).size,
    };
  }, [enquiries]);

  const filtered = useMemo(() => {
    const all = enquiries ?? [];
    const bySource =
      sourceFilter === "all"
        ? all
        : all.filter((e) => e.source === sourceFilter);
    const term = q.trim().toLowerCase();
    if (!term) return bySource;
    return bySource.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.phone.includes(term) ||
        e.subject.toLowerCase().includes(term) ||
        e.message.toLowerCase().includes(term) ||
        (e.packageName ?? "").toLowerCase().includes(term) ||
        (e.packageId ?? "").toLowerCase().includes(term) ||
        (e.occasion ?? "").toLowerCase().includes(term) ||
        (e.city ?? "").toLowerCase().includes(term),
    );
  }, [enquiries, q, sourceFilter]);

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
      "bhojpatra-enquiries.csv",
      filtered.map((e) => ({
        Name: e.name,
        Email: e.email,
        Phone: e.phone,
        Source: sourceLabel(e.source),
        Subject: e.subject,
        Package: e.packageName ?? "",
        Occasion: e.occasion ?? "",
        "Event date": e.eventDate ?? "",
        Guests: e.guests != null ? String(e.guests) : "",
        Message: e.message,
        Attachment: e.documentUrl ?? "",
        "Received At": formatDateTime(e.createdAt),
      })),
    );
  };

  const columns: Column<Enquiry>[] = [
    {
      key: "name",
      header: "Name",
      cell: (e) => <span className="font-medium text-ink">{e.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (e) =>
        e.email ? (
          <a
            href={`mailto:${e.email}`}
            className="font-medium text-maroon hover:underline"
          >
            {e.email}
          </a>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (e) => (
        <a href={`tel:${e.phone}`} className="text-ink hover:underline">
          +91 {e.phone}
        </a>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (e) => <SourceBadge source={e.source} />,
    },
    {
      key: "packageName",
      header: "Package",
      cell: (e) =>
        e.source === "feast-package-interest" ? (
          <span className="font-medium text-ink">
            {e.packageName ?? e.packageId ?? "—"}
          </span>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "occasion",
      header: "Occasion",
      cell: (e) =>
        e.source === "feast-package-interest" ? (
          <span className="text-ink-soft">{e.occasion ?? "—"}</span>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "eventDate",
      header: "Event date",
      cell: (e) =>
        e.source === "feast-package-interest" ? (
          <span className="text-ink-soft">{e.eventDate ?? "—"}</span>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "guests",
      header: "Guests",
      cell: (e) =>
        e.source === "feast-package-interest" && e.guests != null ? (
          <span className="text-ink-soft">{e.guests}</span>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (e) => <span className="text-ink-soft">{e.subject}</span>,
    },
    {
      key: "message",
      header: "Message",
      cell: (e) => (
        <span
          className="block max-w-[22rem] truncate text-ink-soft"
          title={e.message}
        >
          {e.message}
        </span>
      ),
    },
    {
      key: "documentUrl",
      header: "Attachment",
      cell: (e) =>
        e.documentUrl ? (
          <a
            href={e.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-maroon hover:underline"
            title={e.documentName}
          >
            Menu &amp; budget PDF
          </a>
        ) : (
          <span className="text-ink-soft">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Received At",
      cell: (e) => (
        <span className="text-ink-soft">{formatDateTime(e.createdAt)}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  if (enquiries === null) return <LoadingSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Enquiries"
        subtitle="Contact page messages, custom-package PDF requests, and Feast tier interest sign-ups from the home page."
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
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
          className="rounded-xl border border-maroon/30 bg-cream-2 px-4 py-3 text-sm text-maroon"
        >
          Couldn&apos;t load enquiries. Please refresh the page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Mail} label="Total Enquiries" value={String(stats.total)} />
        <StatCard icon={Calendar} label="This Month" value={String(stats.thisMonth)} />
        <StatCard icon={Users} label="Unique Contacts" value={String(stats.contacts)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={q}
          onChange={onSearch}
          placeholder="Search by name, email, phone, package…"
          className="lg:max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="shrink-0 font-medium text-ink">Source</span>
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-control border border-cream-3 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-maroon"
          >
            <option value="all">All sources</option>
            <option value="contact-page">Contact page</option>
            <option value="custom-package">Custom package</option>
            <option value="feast-package-interest">Feast package</option>
          </select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(e) => e.id}
        minWidthClass="min-w-[1280px]"
        empty={
          <EmptyState
            title={q ? "No matching enquiries" : "No enquiries yet"}
            message={
              q
                ? "Try a different search term."
                : "Enquiries will appear here from the Contact page, custom-package uploads, or Feast package interest sign-ups."
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
