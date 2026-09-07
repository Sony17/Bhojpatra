"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import LoadingSkeleton from "@/components/admin/shared/LoadingSkeleton";
import Modal from "@/components/admin/shared/Modal";
import { Field } from "@/components/admin/shared/FormControls";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { Mail, Users, Calendar } from "@/components/admin/shared/icons";
import { WhatsApp } from "@/components/icons";
import { Button } from "@/components/ui";

interface EnquiryAttachment {
  id: string;
  originalName: string;
  storedName: string;
  blobUrl?: string;
  mimeType: string;
  size: number;
  shareToken: string;
  uploadedAt: string;
}

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
  eventType?: string;
  eventDate?: string;
  city?: string;
  guests?: number;
  budget?: string;
  attachment?: EnquiryAttachment;
}

const PAGE_SIZE = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      customCatering: all.filter((e) => e.source === "custom-catering").length,
      withAttachments: all.filter((e) => Boolean(e.attachment)).length,
      thisMonth: all.filter((e) => isThisMonth(e.createdAt)).length,
      contacts: new Set(all.map((e) => e.email.toLowerCase())).size,
    };
  }, [enquiries]);

  const filtered = useMemo(() => {
    const all = enquiries ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.phone.includes(term) ||
        e.subject.toLowerCase().includes(term) ||
        e.message.toLowerCase().includes(term) ||
        (e.city ?? "").toLowerCase().includes(term) ||
        (e.attachment?.originalName ?? "").toLowerCase().includes(term),
    );
  }, [enquiries, q]);

  const total = filtered.length;
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const selected = selectedId
    ? enquiries?.find((e) => e.id === selectedId) ?? null
    : null;

  const onSearch = (v: string) => {
    setQ(v);
    setPage(1);
  };

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.bhojpatra.co.in";

  const getSecureAttachmentUrl = (att: EnquiryAttachment) => {
    return `${origin}/api/enquiries/attachment/${att.id}?token=${att.shareToken}`;
  };

  const buildWhatsAppText = (e: Enquiry) => {
    const lines = [
      `📋 *Bhojpatra ${e.source === "custom-catering" ? "Custom Catering Enquiry" : "Enquiry"}* (${e.id})`,
      "",
      `*Customer:* ${e.name}`,
      `*Phone:* +91 ${e.phone}`,
      e.email ? `*Email:* ${e.email}` : "",
      e.eventType ? `*Event:* ${e.eventType}` : `*Subject:* ${e.subject}`,
      e.eventDate ? `*Date:* ${e.eventDate}` : "",
      e.city ? `*Location:* ${e.city}` : "",
      e.guests ? `*Guests:* ${e.guests}` : "",
      e.budget ? `*Target Budget:* ${e.budget}` : "",
      "",
      `*Requirements / Message:*`,
      e.message || "—",
    ].filter(Boolean);

    if (e.attachment) {
      lines.push("");
      lines.push(`📎 *Attached Menu/Budget PDF:*`);
      lines.push(
        `• File: ${e.attachment.originalName} (${formatBytes(e.attachment.size)})`,
      );
      lines.push(`• Secure PDF Link: ${getSecureAttachmentUrl(e.attachment)}`);
    }

    return lines.join("\n");
  };

  const handleCopyWhatsApp = (e: Enquiry) => {
    const text = buildWhatsAppText(e);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleExport = () => {
    exportCsv(
      "bhojpatra-enquiries.csv",
      filtered.map((e) => ({
        ID: e.id,
        Type: e.source === "custom-catering" ? "Custom Catering" : "Contact Page",
        Name: e.name,
        Email: e.email,
        Phone: e.phone,
        Subject: e.subject,
        Occasion: e.eventType ?? "—",
        Date: e.eventDate ?? "—",
        City: e.city ?? "—",
        Guests: e.guests ?? "—",
        Budget: e.budget ?? "—",
        Message: e.message,
        "Attachment File": e.attachment?.originalName ?? "None",
        "Attachment Secure Link": e.attachment
          ? getSecureAttachmentUrl(e.attachment)
          : "None",
        "Received At": formatDateTime(e.createdAt),
      })),
    );
  };

  const columns: Column<Enquiry>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (e) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{e.name}</span>
            {e.source === "custom-catering" ? (
              <span className="inline-flex items-center rounded-full bg-maroon/10 px-2 py-0.5 text-[10px] font-bold text-maroon">
                Custom Menu
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                Contact Form
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">
            +91 {e.phone} {e.email && `· ${e.email}`}
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Event / Subject",
      cell: (e) => (
        <div>
          <span className="font-medium text-ink">{e.subject}</span>
          {(e.city || e.eventDate || e.guests) && (
            <p className="mt-0.5 text-xs text-ink-soft">
              {[
                e.city,
                e.eventDate,
                e.guests ? `${e.guests} guests` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "attachment",
      header: "PDF Brief",
      cell: (e) =>
        e.attachment ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-maroon/20 bg-cream/30 px-2.5 py-1 text-xs font-semibold text-maroon">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="max-w-[8rem] truncate" title={e.attachment.originalName}>
              {e.attachment.originalName}
            </span>
          </span>
        ) : (
          <span className="text-xs text-ink-soft/60">—</span>
        ),
    },
    {
      key: "message",
      header: "Requirements",
      cell: (e) => (
        <span
          className="block max-w-[18rem] truncate text-ink-soft text-xs"
          title={e.message}
        >
          {e.message}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Received At",
      cell: (e) => (
        <span className="text-xs text-ink-soft">{formatDateTime(e.createdAt)}</span>
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
        subtitle="Customer enquiries and bespoke catering briefs with attached menu/budget PDFs."
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard icon={Mail} label="Total Enquiries" value={String(stats.total)} />
        <StatCard icon={Users} label="Custom Menu Requests" value={String(stats.customCatering)} />
        <StatCard icon={Calendar} label="PDFs Attached" value={String(stats.withAttachments)} />
        <StatCard icon={Calendar} label="This Month" value={String(stats.thisMonth)} />
      </div>

      <SearchBar
        value={q}
        onChange={onSearch}
        placeholder="Search by customer, phone, city, or PDF name…"
        className="lg:max-w-md"
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(e) => e.id}
        onRowClick={(e) => setSelectedId(e.id)}
        minWidthClass="min-w-[920px]"
        empty={
          <EmptyState
            title={q ? "No matching enquiries" : "No enquiries yet"}
            message={
              q
                ? "Try a different search term."
                : "Enquiries will appear here as visitors submit requests."
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

      {/* Enquiry Details & WhatsApp Forwarding Modal */}
      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelectedId(null);
          setCopied(false);
        }}
        title={
          selected
            ? `${selected.source === "custom-catering" ? "Custom Catering Enquiry" : "Enquiry"} ${selected.id}`
            : "Enquiry"
        }
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              {selected.source === "custom-catering" ? (
                <span className="rounded-full bg-maroon px-2.5 py-0.5 text-xs font-semibold text-white">
                  Custom Catering Request
                </span>
              ) : (
                <span className="rounded-full bg-cream-3 px-2.5 py-0.5 text-xs font-semibold text-ink">
                  Contact Form Message
                </span>
              )}
              <span className="text-xs text-ink-soft">
                Received: {formatDateTime(selected.createdAt)}
              </span>
            </div>

            {/* Customer & Event Details */}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-cream-3 bg-cream/10 p-4 sm:grid-cols-2">
              <Field label="Customer Name">
                <p className="font-semibold text-sm text-ink">{selected.name}</p>
              </Field>

              <Field label="Phone">
                <a
                  href={`tel:${selected.phone}`}
                  className="text-sm font-medium text-maroon hover:underline"
                >
                  +91 {selected.phone}
                </a>
              </Field>

              {selected.email && (
                <Field label="Email">
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm break-all text-ink hover:underline"
                  >
                    {selected.email}
                  </a>
                </Field>
              )}

              <Field label="Occasion / Subject">
                <p className="text-sm text-ink">
                  {selected.eventType || selected.subject}
                </p>
              </Field>

              {selected.eventDate && (
                <Field label="Event Date">
                  <p className="text-sm text-ink">{selected.eventDate}</p>
                </Field>
              )}

              {selected.city && (
                <Field label="Location / City">
                  <p className="text-sm text-ink">{selected.city}</p>
                </Field>
              )}

              {selected.guests && (
                <Field label="Expected Guests">
                  <p className="text-sm text-ink">{selected.guests} guests</p>
                </Field>
              )}

              {selected.budget && (
                <Field label="Target Budget">
                  <p className="text-sm font-semibold text-maroon">{selected.budget}</p>
                </Field>
              )}
            </dl>

            {/* Requirements / Message */}
            <Field label="Catering Requirements / Notes">
              <div className="rounded-xl border border-cream-3 bg-white p-3.5 text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {selected.message || "No additional requirements specified."}
              </div>
            </Field>

            {/* Attachment Card (if present) */}
            {selected.attachment && (
              <div className="rounded-xl border border-maroon/20 bg-cream/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                    Attached Menu / Budget PDF
                  </span>
                  <span className="text-xs text-ink-soft">
                    {formatBytes(selected.attachment.size)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maroon font-bold text-xs text-white">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        {selected.attachment.originalName}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        Uploaded: {formatDateTime(selected.attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View PDF - streams directly in browser with active admin session */}
                    <a
                      href={`/api/enquiries/attachment/${selected.attachment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-maroon/25 bg-white px-3 py-1.5 text-xs font-bold text-maroon shadow-sm hover:bg-cream/40 transition"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View PDF
                    </a>

                    {/* Download PDF */}
                    <a
                      href={`/api/enquiries/attachment/${selected.attachment.id}`}
                      download={selected.attachment.originalName}
                      className="inline-flex items-center gap-1 rounded-lg bg-maroon px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-maroon/90 transition"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Forwarding Section */}
            <div className="rounded-xl border border-cream-3 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Forward Enquiry to WhatsApp
                  </h4>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Includes customer details, catering requirements, and the secure PDF link.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  href={`https://wa.me/?text=${encodeURIComponent(
                    buildWhatsAppText(selected),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="md"
                  leftIcon={<WhatsApp className="h-4 w-4" />}
                >
                  Forward to WhatsApp
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleCopyWhatsApp(selected)}
                >
                  {copied ? "Copied to Clipboard!" : "Copy Details & Link"}
                </Button>
              </div>

              {selected.attachment && (
                <div className="rounded-lg bg-cream/30 p-2.5 text-[11px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-maroon">Document Access Security:</span>{" "}
                  The generated WhatsApp link contains a cryptographically signed token
                  granting access exclusively to this attached PDF brief. Other files and
                  internal stores remain strictly protected.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
