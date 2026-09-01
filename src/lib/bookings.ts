/**
 * Client-side access layer for the customer's own bookings.
 *
 * Orders live in the database (`/api/bookings`) — placed by the booking wizard,
 * read back here for the My Bookings page (`fetchMyBookings` → GET
 * /api/bookings/mine) and edited via `patchMyBooking` (PATCH /api/bookings/:id).
 * The list starts empty; only feasts the user actually books appear. Each record
 * carries a pre-built plain-text receipt so the "Download" action can export
 * that one order on its own. This module also holds the pure helpers shared with
 * the server routes (vendor keys, invoice fallback, receipt PDF).
 */

import type { Booking } from "@/lib/data";
import type { InvoiceData } from "@/lib/invoice";
import type { EmiPlan } from "@/lib/emi";

/** A booked order, plus the receipt text used by the per-order download. */
export interface StoredBooking extends Booking {
  /** Customer name captured at booking time. */
  customer?: string;
  /** Customer phone number. */
  phone?: string;
  /** Customer email address. */
  email?: string;
  /** Plain-text order summary — what "Download" saves for this booking alone. */
  receipt: string;
  /** Itemised invoice data so the order can be re-downloaded as a PDF invoice.
   *  Optional for backward-compatibility with orders saved before invoices. */
  invoice?: InvoiceData;
  /** Free-text special requests the customer added when editing the booking. */
  note?: string;
  /** Instalment schedule for the balance after the 10% advance, when the guest
   *  chose to pay the rest in EMIs. Absent for single-payment / unpaid orders. */
  emiPlan?: EmiPlan;
  /** The specific vendors catered for this order (catalogue id + display name),
   *  captured at booking time so each can be rated individually from My Bookings.
   *  Absent on older orders saved before per-vendor reviews — fall back to
   *  splitting the joined `vendor` label with `bookingVendors()`. */
  vendors?: BookedVendor[];
  /** Per-vendor ratings the customer left for this order, once reviewed. Keyed by
   *  vendor; used to prefill the review editor and mirror ratings onto the card. */
  reviews?: BookingVendorReview[];
  /** Summary of the customer's review for this order (rounded average across the
   *  per-vendor ratings + their first comment). Drives the card's star display.
   *  Absent until reviewed. Kept for back-compat with the single-review editor. */
  review?: { rating: number; comment: string; createdAt: string };
  /** Set when the customer explicitly reopens a Completed booking back to
   *  Confirmed (un-complete). Stops the auto-complete sweep for past events
   *  from immediately re-completing it, so the un-complete sticks. */
  reopened?: boolean;
}

/** A vendor chosen for an order — the catalogue id (empty for legacy orders that
 *  only kept names) plus the display name. */
export interface BookedVendor {
  id: string;
  name: string;
}

/** One customer rating for a single vendor on an order. */
export interface BookingVendorReview {
  vendorId: string;
  vendorName: string;
  rating: number;
  comment: string;
  /** Public URLs of photos the reviewer attached (mirrored for prefill). */
  images?: string[];
  createdAt: string;
}

/** Stable key for a booked vendor: its catalogue id when known, else a slug of
 *  its name (legacy orders). Used to tie reviews to a vendor consistently. */
export function vendorKey(v: { id?: string; name: string }): string {
  return v.id || slugifyName(v.name);
}

/** Lowercase, hyphenated slug of a vendor name — the name-bridge key used to
 *  match reviews to catalogue listings that don't share the booking's ids. */
export function slugifyName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The vendors that can be rated for an order: the stored `vendors` list when
 *  present, otherwise the joined `vendor` label split back into names (older
 *  orders). Always returns at least one entry so the review editor has a row. */
export function bookingVendors(b: StoredBooking): BookedVendor[] {
  if (b.vendors?.length) return b.vendors;
  const names = (b.vendor || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (names.length ? names : ["Bhojpatra"]).map((name) => ({ id: "", name }));
}

/** Notify any open My Bookings / review view that the customer's list changed
 *  (so it re-fetches from the API). Same-tab only — the server is the single
 *  source of truth, so a change here just prompts a refresh. */
const CHANGED_EVENT = "bhojpatra:bookings-changed";

/** Fire the change event so every subscribed view re-fetches. */
export function emitBookingsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** The result of a booking PATCH — carries the server's error message so the
 *  caller can surface it (e.g. an invalid status transition). */
export interface BookingPatchResult {
  ok: boolean;
  order?: StoredBooking;
  error?: string;
}

/** Fetch the signed-in customer's own bookings from the API (newest first).
 *  Returns an empty list when signed out or offline. */
export async function fetchMyBookings(): Promise<StoredBooking[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/bookings/mine", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as
      | { orders?: StoredBooking[] }
      | null;
    return Array.isArray(json?.orders) ? json.orders : [];
  } catch {
    return [];
  }
}

/** Patch one of the customer's bookings via the API (status, edits, notes or
 *  the per-vendor review mirror). Notifies open views on success so they
 *  re-fetch. The owner/transition rules are enforced server-side. */
export async function patchMyBooking(
  id: string,
  patch: Partial<StoredBooking>,
): Promise<BookingPatchResult> {
  if (typeof window === "undefined") return { ok: false };
  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = (await res.json().catch(() => null)) as
      | { order?: StoredBooking; error?: string }
      | null;
    if (!res.ok) return { ok: false, error: json?.error };
    emitBookingsChanged();
    return { ok: true, order: json?.order };
  } catch {
    return { ok: false };
  }
}

/** Subscribe to booking-list changes (same tab). Returns an unsubscribe fn. */
export function onStoredBookingsChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
  };
}

/** The invoice for a booking — its stored itemised invoice when present, or a
 *  minimal one synthesised from the summary fields (older orders saved before
 *  invoices existed) so Download / Share / preview always have something real
 *  to render. GST shows as 0 on the fallback since the split isn't stored. */
export function bookingInvoice(b: StoredBooking): InvoiceData {
  // Payments accrue after booking (an advance now, the balance later, or the
  // team collecting each instalment), so the "Amount Paid" must always come
  // from the live order — never the amount frozen into the invoice snapshot at
  // booking time (which is 0 on the online-advance path, where the payment is
  // recorded a tick before the snapshot's `paidAmount` state has flushed).
  if (b.invoice) return { ...b.invoice, paid: b.paid };
  return {
    id: b.id,
    dateLabel: b.date,
    occasion: b.occasion,
    eventDate: b.date,
    city: b.city,
    venue: "-",
    guests: b.guests,
    packageName: b.vendor,
    lines: [{ label: `${b.occasion} — ${b.vendor}`, amount: b.amount }],
    menu: [],
    subtotal: b.amount,
    addOnsTotal: 0,
    discount: 0,
    gst: 0,
    grandTotal: b.amount,
    paid: b.paid,
  };
}

/** Trigger a browser download of a single order's receipt as a PDF file. */
export function downloadReceipt(booking: Pick<StoredBooking, "id" | "receipt">): void {
  if (typeof window === "undefined") return;
  const bytes = receiptToPdf(booking.receipt);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bhojpatra-${booking.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── Minimal text-to-PDF ──────────────────────────────────────────────────
 * The receipt is plain monospace text, so we render it into a hand-built
 * PDF (Courier, single column, auto-paginated). This keeps the export a real
 * .pdf with zero extra dependencies. The standard-14 Courier font only covers
 * Latin-1, so non-Latin-1 glyphs (₹, bullets, dashes) are transliterated. */

/** Escape the three characters that are special inside a PDF string literal. */
function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Map glyphs the Courier base font can't show onto safe Latin-1 equivalents. */
function toLatin1(s: string): string {
  return s
    .replace(/₹/g, "Rs ")
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x00-\xff]/g, "?");
}

/** Hard-wrap a single logical line to a max character width. */
function wrapLine(line: string, max: number): string[] {
  if (line.length <= max) return [line];
  const out: string[] = [];
  for (let rest = line; rest.length > 0; rest = rest.slice(max)) {
    out.push(rest.slice(0, max));
  }
  return out;
}

function receiptToPdf(text: string): Uint8Array<ArrayBuffer> {
  const fontSize = 10;
  const leading = 14;
  const left = 50;
  const top = 742; // 792 (Letter height) − 50 top margin
  const maxChars = 84; // fits Courier 10pt within ~512pt of usable width
  const linesPerPage = 48;

  const lines = toLatin1(text)
    .split("\n")
    .flatMap((l) => wrapLine(l, maxChars));

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  // Object numbering: 1 Catalog, 2 Pages, 3 Font, then (content, page) per page.
  const objects: string[] = [];
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  const pageObjNums: number[] = [];
  pages.forEach((pageLines, i) => {
    const contentNum = 4 + i * 2;
    const pageNum = 5 + i * 2;
    pageObjNums.push(pageNum);

    let stream = `BT\n/F1 ${fontSize} Tf\n${leading} TL\n${left} ${top} Td\n`;
    pageLines.forEach((ln, idx) => {
      stream += `(${escapePdfText(ln)}) Tj\n`;
      if (idx < pageLines.length - 1) stream += "T*\n";
    });
    stream += "ET";

    objects[contentNum - 1] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageNum - 1] =
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Resources << /Font << /F1 3 0 R >> >> " +
      `/Contents ${contentNum} 0 R >>`;
  });

  objects[1] =
    `<< /Type /Pages /Kids [${pageObjNums
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`;

  // Serialise, tracking each object's byte offset for the xref table.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n <= objects.length; n++) {
    offsets[n] = pdf.length;
    pdf += `${n} 0 obj\n${objects[n - 1]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  const size = objects.length + 1;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n <= objects.length; n++) {
    pdf += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // Every char is Latin-1 (code ≤ 255), so string length equals byte length —
  // which is what the xref offsets above were computed against.
  const bytes = new Uint8Array(new ArrayBuffer(pdf.length));
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
