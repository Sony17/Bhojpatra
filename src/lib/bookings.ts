/**
 * Client-side store for the customer's own bookings.
 *
 * There's no bookings backend yet — when a guest completes the booking wizard
 * we persist the order in localStorage so it shows up on the My Bookings page
 * (/bookings). The list starts empty; only feasts the user actually books
 * appear. Each record carries a pre-built plain-text receipt so the "Download"
 * action can export that one order on its own.
 */

import type { Booking } from "@/lib/data";
import type { InvoiceData } from "@/lib/invoice";
import type { EmiPlan } from "@/lib/emi";

/** A booked order, plus the receipt text used by the per-order download. */
export interface StoredBooking extends Booking {
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

const KEY = "bhojpatra.bookings";

/** Notify any open My Bookings view that the stored list changed. */
const CHANGED_EVENT = "bhojpatra:bookings-changed";

export function getStoredBookings(): StoredBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredBooking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Prepend a new booking so the most recent order shows first. */
export function addStoredBooking(booking: StoredBooking): void {
  if (typeof window === "undefined") return;
  try {
    const next = [booking, ...getStoredBookings().filter((b) => b.id !== booking.id)];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    /* storage unavailable (private mode) — ignore for the mock */
  }
}

/** Merge a patch into one stored booking (by id) and notify open views. Used
 *  by the My Bookings editor — leaves every other order untouched. */
export function updateStoredBooking(
  id: string,
  patch: Partial<StoredBooking>,
): void {
  if (typeof window === "undefined") return;
  try {
    const next = getStoredBookings().map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    );
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    /* storage unavailable (private mode) — ignore for the mock */
  }
}

/** Subscribe to stored-booking changes (same tab + other tabs). Returns an
 *  unsubscribe function. */
export function onStoredBookingsChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

/** The invoice for a booking — its stored itemised invoice when present, or a
 *  minimal one synthesised from the summary fields (older orders saved before
 *  invoices existed) so Download / Share / preview always have something real
 *  to render. GST shows as 0 on the fallback since the split isn't stored. */
export function bookingInvoice(b: StoredBooking): InvoiceData {
  if (b.invoice) return b.invoice;
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
