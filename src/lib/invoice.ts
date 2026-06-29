/**
 * Invoice PDF generator.
 *
 * Renders a branded, itemised "TAX INVOICE" as a real PDF — no third-party
 * library. The builder supports text (Helvetica / Helvetica-Bold for labels,
 * Courier for right-aligned amounts so column widths stay exact), filled
 * rectangles (header band, table header, totals band) and rules, with
 * automatic page breaks. The standard-14 fonts only cover Latin-1, so glyphs
 * like ₹ are transliterated (₹ → "Rs ").
 */

/** One billable row in the invoice table. */
export interface InvoiceLine {
  label: string;
  amount: number;
}

/** A menu course and the dishes picked under it (for the selections section). */
export interface InvoiceMenuGroup {
  heading: string;
  items: string;
}

/** Everything needed to render an invoice — fully serialisable so it can be
 *  stored on a booking and re-downloaded later. */
export interface InvoiceData {
  id: string;
  dateLabel: string;
  occasion: string;
  eventDate: string;
  city: string;
  venue: string;
  guests: number;
  packageName: string;
  lines: InvoiceLine[];
  menu: InvoiceMenuGroup[];
  subtotal: number;
  addOnsTotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  paid: number;
}

/* ── Geometry & brand palette (RGB 0–1; brand colours only) ──────────────── */
const PAGE_W = 612;
const PAGE_H = 792;
const MX = 40; // left/right margin
const RIGHT = PAGE_W - MX;
const BOTTOM = 56; // bottom margin before a page break

type RGB = [number, number, number];
const MAROON: RGB = [0.725, 0.125, 0.145]; // #B92025
const CREAM: RGB = [0.941, 0.816, 0.62]; //  #F0D09E
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [1, 1, 1];

const F_REG = "F1"; // Helvetica
const F_BOLD = "F2"; // Helvetica-Bold
const F_MONO = "F3"; // Courier (monospace → exact right-alignment)

const nf = new Intl.NumberFormat("en-IN");
const money = (n: number) => `Rs ${nf.format(Math.round(n))}`;

function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toLatin1(s: string): string {
  return s
    .replace(/₹/g, "Rs ")
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[×]/g, "x")
    .replace(/[^\x00-\xff]/g, "?");
}

/* ── PDF builder ─────────────────────────────────────────────────────────── */
class Pdf {
  private pages: string[] = [];
  private ops = "";
  y = PAGE_H;

  private rgb(c: RGB, stroke = false): string {
    return `${c[0]} ${c[1]} ${c[2]} ${stroke ? "RG" : "rg"}`;
  }

  /** Absolute-positioned text (origin bottom-left; `y` is the baseline). */
  text(x: number, y: number, s: string, size: number, font: string, color: RGB) {
    this.ops +=
      `BT /${font} ${size} Tf ${this.rgb(color)} ` +
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(toLatin1(s))}) Tj ET\n`;
  }

  /** Right-aligned monospace text, so numeric columns line up exactly. */
  textRight(xRight: number, y: number, s: string, size: number, color: RGB) {
    const clean = toLatin1(s);
    const w = clean.length * size * 0.6; // Courier advance = 0.6em
    this.text(xRight - w, y, s, size, F_MONO, color);
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops += `${this.rgb(color)} ${x} ${y} ${w} ${h} re f\n`;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) {
    this.ops += `${this.rgb(color, true)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  /** Break to a fresh page if `space` points won't fit above the bottom margin. */
  ensure(space: number) {
    if (this.y - space < BOTTOM) {
      this.pages.push(this.ops);
      this.ops = "";
      this.y = PAGE_H - 50;
    }
  }

  finish(): Uint8Array<ArrayBuffer> {
    this.pages.push(this.ops);

    // 1 Catalog, 2 Pages, 3-5 Fonts, then (content, page) per page.
    const objects: string[] = [];
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

    const pageNums: number[] = [];
    this.pages.forEach((stream, i) => {
      const contentNum = 6 + i * 2;
      const pageNum = 7 + i * 2;
      pageNums.push(pageNum);
      objects[contentNum - 1] =
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      objects[pageNum - 1] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        "/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> " +
        `/Contents ${contentNum} 0 R >>`;
    });
    objects[1] =
      `<< /Type /Pages /Kids [${pageNums
        .map((n) => `${n} 0 R`)
        .join(" ")}] /Count ${this.pages.length} >>`;

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

    const bytes = new Uint8Array(new ArrayBuffer(pdf.length));
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return bytes;
  }
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export function buildInvoicePdf(data: InvoiceData): Uint8Array<ArrayBuffer> {
  const p = new Pdf();

  // Header band.
  p.rect(0, PAGE_H - 92, PAGE_W, 92, MAROON);
  p.text(MX, PAGE_H - 46, "bhojpatra", 24, F_BOLD, WHITE);
  p.text(MX, PAGE_H - 64, "Premium Catering & Feasts", 9, F_REG, CREAM);
  p.text(400, PAGE_H - 40, "TAX INVOICE", 15, F_BOLD, WHITE);
  p.text(400, PAGE_H - 58, `Invoice No: ${data.id}`, 9, F_REG, CREAM);
  p.text(400, PAGE_H - 72, `Date: ${data.dateLabel}`, 9, F_REG, CREAM);
  p.y = PAGE_H - 92 - 26;

  // Billed-to / event block.
  p.text(MX, p.y, "BILLED TO / EVENT", 9, F_BOLD, MAROON);
  p.y -= 15;
  const details: [string, string][] = [
    ["Occasion", data.occasion],
    ["Package", data.packageName],
    ["Event Date", data.eventDate],
    ["Guests", nf.format(data.guests)],
    ["City", data.city],
    ["Venue", data.venue],
  ];
  details.forEach(([label, value]) => {
    p.text(MX, p.y, `${label}:`, 9, F_REG, BLACK);
    p.text(MX + 90, p.y, value || "-", 9, F_BOLD, BLACK);
    p.y -= 14;
  });
  p.y -= 8;

  // Line-item table header.
  p.rect(MX, p.y - 5, RIGHT - MX, 19, CREAM);
  p.text(MX + 6, p.y, "DESCRIPTION", 9, F_BOLD, MAROON);
  p.textRight(RIGHT - 6, p.y, "AMOUNT", 9, MAROON);
  p.y -= 22;

  // Line-item rows.
  data.lines.forEach((ln) => {
    p.ensure(16);
    p.text(MX + 6, p.y, ln.label, 9, F_REG, BLACK);
    p.textRight(RIGHT - 6, p.y, money(ln.amount), 9, BLACK);
    p.y -= 14;
    p.line(MX, p.y + 4, RIGHT, p.y + 4, CREAM, 0.4);
  });
  p.y -= 8;

  // Totals (right-hand stack).
  const labelX = 360;
  const totalRow = (label: string, value: string, color: RGB = BLACK) => {
    p.ensure(15);
    p.text(labelX, p.y, label, 9, F_REG, color);
    p.textRight(RIGHT - 6, p.y, value, 9, color);
    p.y -= 15;
  };
  totalRow("Subtotal", money(data.subtotal));
  totalRow("Add-ons", money(data.addOnsTotal));
  if (data.discount > 0) totalRow("Discount", `- ${money(data.discount)}`, MAROON);
  totalRow("GST (18%)", money(data.gst));

  // Grand-total band.
  p.ensure(24);
  p.rect(labelX - 6, p.y - 4, RIGHT - (labelX - 6), 21, MAROON);
  p.text(labelX, p.y, "GRAND TOTAL", 10, F_BOLD, WHITE);
  p.textRight(RIGHT - 6, p.y, money(data.grandTotal), 11, WHITE);
  p.y -= 26;

  // Payment status.
  totalRow("Paid", money(data.paid));
  const balance = Math.max(0, Math.round(data.grandTotal) - Math.round(data.paid));
  totalRow("Balance Due", money(balance), balance > 0 ? MAROON : BLACK);
  p.y -= 10;

  // Menu selections.
  if (data.menu.length > 0) {
    p.ensure(24);
    p.line(MX, p.y + 6, RIGHT, p.y + 6, CREAM, 0.6);
    p.text(MX, p.y, "MENU SELECTIONS", 9, F_BOLD, MAROON);
    p.y -= 16;
    data.menu.forEach((g) => {
      p.ensure(14);
      p.text(MX, p.y, g.heading, 9, F_BOLD, BLACK);
      p.y -= 12;
      wrap(g.items, 96).forEach((row) => {
        p.ensure(12);
        p.text(MX + 10, p.y, row, 8.5, F_REG, BLACK);
        p.y -= 11;
      });
      p.y -= 4;
    });
  }

  // Footer note.
  p.ensure(18);
  p.text(
    MX,
    p.y,
    "Thank you for choosing Bhojpatra. This is a computer-generated invoice and needs no signature.",
    8,
    F_REG,
    BLACK,
  );

  return p.finish();
}

/** Hard-wrap a string to a max character width. */
function wrap(s: string, max: number): string[] {
  const words = s.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

/** Trigger a browser download of the invoice as a PDF. */
export function downloadInvoice(data: InvoiceData): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildInvoicePdf(data)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bhojpatra-Invoice-${data.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
