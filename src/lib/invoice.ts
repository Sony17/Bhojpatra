/**
 * Invoice PDF generator.
 *
 * Renders a branded, boutique "TAX INVOICE" as a real PDF — no third-party
 * library. The builder supports measured text (Helvetica / Helvetica-Bold via
 * embedded AFM widths, so proportional text can be centred and right-aligned
 * exactly), letter-spacing, filled rectangles, stroked frames and rules, with
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
const MX = 44; // left/right content margin
const RIGHT = PAGE_W - MX;
const BOTTOM = 96; // bottom margin (reserves room for the footer band)

type RGB = [number, number, number];
const MAROON: RGB = [0.725, 0.125, 0.145]; // #B92025
const CREAM: RGB = [0.941, 0.816, 0.62]; //  #F0D09E
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [1, 1, 1];

const F_REG = "F1"; // Helvetica
const F_BOLD = "F2"; // Helvetica-Bold
const F_MONO = "F3"; // Courier (every glyph 600/1000)

const nf = new Intl.NumberFormat("en-IN");
const money = (n: number) => `Rs ${nf.format(Math.round(n))}`;

/* ── Font metrics (AFM advance widths, units / 1000 em, codes 32–126) ────── */
// prettier-ignore
const W_HELV = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,
  278,278,584,584,584,556,1015,
  667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  278,278,278,469,556,333,
  556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
  334,260,334,584,
];
// prettier-ignore
const W_BOLD = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,
  333,333,584,584,584,611,975,
  722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  333,278,333,584,556,333,
  556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
  389,280,389,584,
];

function charWidth(code: number, font: string): number {
  if (font === F_MONO) return 600;
  if (code < 32 || code > 126) return 556;
  return (font === F_BOLD ? W_BOLD : W_HELV)[code - 32];
}

/** Width of a (Latin-1 cleaned) string in points, including letter-spacing. */
function measure(s: string, font: string, size: number, tracking = 0): number {
  const clean = toLatin1(s);
  let w = 0;
  for (let i = 0; i < clean.length; i++) w += charWidth(clean.charCodeAt(i), font);
  return (w * size) / 1000 + tracking * Math.max(0, clean.length - 1);
}

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

/** A pre-rasterised RGB bitmap (each char of `data` is one 0–255 byte, packed
 *  R,G,B per pixel) plus the source aspect ratio, ready to embed in the PDF. */
interface LogoBitmap {
  w: number;
  h: number;
  data: string;
  ratio: number;
}

/* ── PDF builder ─────────────────────────────────────────────────────────── */
class Pdf {
  private pages: string[] = [];
  private ops = "";
  private images: { w: number; h: number; data: string }[] = [];
  y = PAGE_H;

  private rgb(c: RGB, stroke = false): string {
    return `${c[0]} ${c[1]} ${c[2]} ${stroke ? "RG" : "rg"}`;
  }

  /** Absolute-positioned text (origin bottom-left; `y` is the baseline). */
  text(
    x: number,
    y: number,
    s: string,
    size: number,
    font: string,
    color: RGB,
    tracking = 0,
  ) {
    this.ops +=
      `BT /${font} ${size} Tf ${tracking} Tc ${this.rgb(color)} ` +
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(toLatin1(s))}) Tj ET\n`;
  }

  /** Right-aligned text, measured so numeric columns line up exactly. */
  textRight(xRight: number, y: number, s: string, size: number, font: string, color: RGB) {
    this.text(xRight - measure(s, font, size), y, s, size, font, color);
  }

  /** Horizontally centred text. */
  textCenter(
    cx: number,
    y: number,
    s: string,
    size: number,
    font: string,
    color: RGB,
    tracking = 0,
  ) {
    this.text(cx - measure(s, font, size, tracking) / 2, y, s, size, font, color, tracking);
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops += `${this.rgb(color)} ${x} ${y} ${w} ${h} re f\n`;
  }

  /** Stroked (outline-only) rectangle — for cards and decorative frames. */
  rectS(x: number, y: number, w: number, h: number, color: RGB, width = 0.8) {
    this.ops += `${this.rgb(color, true)} ${width} w ${x} ${y} ${w} ${h} re S\n`;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) {
    this.ops += `${this.rgb(color, true)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  /** Draw a pre-rasterised RGB image; (x, y) is the bottom-left corner and
   *  (w, h) the placement size in points. */
  image(x: number, y: number, w: number, h: number, img: { w: number; h: number; data: string }) {
    const idx = this.images.length;
    this.images.push(img);
    this.ops +=
      `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im${idx} Do Q\n`;
  }

  /** Break to a fresh page if `space` points won't fit above the bottom margin. */
  ensure(space: number) {
    if (this.y - space < BOTTOM) this.newPage();
  }

  newPage() {
    this.pages.push(this.ops);
    this.ops = "";
    this.y = PAGE_H - 56;
  }

  finish(): Uint8Array<ArrayBuffer> {
    this.pages.push(this.ops);

    // 1 Catalog, 2 Pages, 3-5 Fonts, then (content, page) per page.
    const objects: string[] = [];
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

    // Image XObjects live after the (content, page) pairs.
    const imgBase = 6 + this.pages.length * 2;
    const xobj = this.images.length
      ? "/XObject << " +
        this.images.map((_, i) => `/Im${i} ${imgBase + i} 0 R`).join(" ") +
        " >> "
      : "";

    const pageNums: number[] = [];
    this.pages.forEach((stream, i) => {
      const contentNum = 6 + i * 2;
      const pageNum = 7 + i * 2;
      pageNums.push(pageNum);
      objects[contentNum - 1] =
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
      objects[pageNum - 1] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> ${xobj}>> ` +
        `/Contents ${contentNum} 0 R >>`;
    });

    this.images.forEach((im, i) => {
      const num = imgBase + i;
      objects[num - 1] =
        `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${im.data.length} >>\n` +
        `stream\n${im.data}\nendstream`;
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
export function buildInvoicePdf(
  data: InvoiceData,
  logo?: LogoBitmap | null,
): Uint8Array<ArrayBuffer> {
  const p = new Pdf();

  /* Masthead — full-bleed maroon band with an inset cream frame. */
  const HEAD = 116;
  p.rect(0, PAGE_H - HEAD, PAGE_W, HEAD, MAROON);
  p.rectS(14, PAGE_H - HEAD + 12, PAGE_W - 28, HEAD - 24, CREAM, 0.8);

  /* Brand mark: the cream logo when it could be rasterised, else the wordmark. */
  if (logo) {
    const h = 30;
    p.image(MX, PAGE_H - 72, h * logo.ratio, h, logo);
  } else {
    p.text(MX, PAGE_H - 56, "bhojpatra", 30, F_BOLD, CREAM);
  }
  p.text(MX + 2, PAGE_H - 74, "PREMIUM CATERING & FEASTS", 8, F_REG, WHITE, 2.2);

  p.textRight(RIGHT, PAGE_H - 50, "TAX INVOICE", 15, F_BOLD, WHITE);
  p.textRight(RIGHT, PAGE_H - 70, `Invoice No.  ${data.id}`, 9, F_REG, CREAM);
  p.textRight(RIGHT, PAGE_H - 84, `Date  ${data.dateLabel}`, 9, F_REG, CREAM);

  p.y = PAGE_H - HEAD - 34;

  /* Section helper — small-caps maroon label with a short accent rule. */
  const sectionLabel = (s: string) => {
    p.text(MX, p.y, s, 9, F_BOLD, MAROON, 1.6);
    p.line(MX, p.y - 6, MX + 34, p.y - 6, MAROON, 1.4);
    p.y -= 22;
  };

  /* Event details — balanced two-column grid. */
  sectionLabel("EVENT DETAILS");
  const COL2 = 312;
  const field = (x: number, label: string, value: string) => {
    p.text(x, p.y, label, 8.5, F_REG, MAROON);
    p.text(x, p.y - 12, value || "-", 10, F_BOLD, BLACK);
  };
  field(MX, "OCCASION", data.occasion);
  field(COL2, "PACKAGE", data.packageName);
  p.y -= 30;
  field(MX, "EVENT DATE", data.eventDate);
  field(COL2, "GUESTS", nf.format(data.guests));
  p.y -= 30;
  field(MX, "CITY", data.city);
  field(COL2, "VENUE", data.venue);
  p.y -= 34;

  /* Itemised charges table. */
  sectionLabel("CHARGES");
  p.rect(MX, p.y - 7, RIGHT - MX, 21, CREAM);
  p.text(MX + 10, p.y, "DESCRIPTION", 8.5, F_BOLD, MAROON, 1);
  p.textRight(RIGHT - 10, p.y, "AMOUNT", 8.5, F_BOLD, MAROON);
  p.y -= 25;

  data.lines.forEach((ln) => {
    p.ensure(16);
    p.text(MX + 10, p.y, ln.label, 9.5, F_REG, BLACK);
    p.textRight(RIGHT - 10, p.y, money(ln.amount), 9.5, F_REG, BLACK);
    p.y -= 16;
    p.line(MX, p.y + 5, RIGHT, p.y + 5, CREAM, 0.4);
  });
  p.y -= 12;

  /* Totals stack (right column). */
  const labelX = 372;
  const totalRow = (label: string, value: string, color: RGB = BLACK) => {
    p.ensure(15);
    p.text(labelX, p.y, label, 9.5, F_REG, color);
    p.textRight(RIGHT - 10, p.y, value, 9.5, F_REG, color);
    p.y -= 16;
  };
  totalRow("Subtotal", money(data.subtotal));
  if (data.addOnsTotal > 0) totalRow("Add-ons", money(data.addOnsTotal));
  if (data.discount > 0) totalRow("Discount", `- ${money(data.discount)}`, MAROON);
  totalRow("GST (18%)", money(data.gst));
  p.y -= 8;

  /* Grand-total showpiece — full-width maroon band, oversized amount. */
  p.ensure(70);
  const bandTop = p.y;
  const BANDH = 52;
  p.rect(MX, bandTop - BANDH, RIGHT - MX, BANDH, MAROON);
  p.text(MX + 18, bandTop - 21, "GRAND TOTAL", 12, F_BOLD, CREAM, 2);
  p.text(MX + 18, bandTop - 37, "Total amount for your event", 8, F_REG, WHITE);
  p.textRight(RIGHT - 18, bandTop - 33, money(data.grandTotal), 27, F_BOLD, WHITE);
  p.y = bandTop - BANDH - 26;

  /* Payment status — Paid + Balance cards side by side. */
  const balance = Math.max(0, Math.round(data.grandTotal) - Math.round(data.paid));
  p.ensure(54);
  const cardTop = p.y;
  const CARDH = 48;
  const gap = 16;
  const cardW = (RIGHT - MX - gap) / 2;
  const paidX = MX;
  const balX = MX + cardW + gap;

  p.rectS(paidX, cardTop - CARDH, cardW, CARDH, CREAM, 1);
  p.text(paidX + 14, cardTop - 16, "AMOUNT PAID", 8, F_BOLD, MAROON, 1.4);
  p.text(paidX + 14, cardTop - 36, money(data.paid), 15, F_BOLD, BLACK);

  if (balance > 0) {
    p.rect(balX, cardTop - CARDH, cardW, CARDH, MAROON);
    p.text(balX + 14, cardTop - 16, "BALANCE DUE", 8, F_BOLD, CREAM, 1.4);
    p.text(balX + 14, cardTop - 36, money(balance), 15, F_BOLD, WHITE);
  } else {
    p.rectS(balX, cardTop - CARDH, cardW, CARDH, CREAM, 1);
    p.text(balX + 14, cardTop - 16, "BALANCE DUE", 8, F_BOLD, MAROON, 1.4);
    p.text(balX + 14, cardTop - 35, "PAID IN FULL", 13, F_BOLD, MAROON, 1);
  }
  p.y = cardTop - CARDH - 28;

  /* Menu selections. */
  if (data.menu.length > 0) {
    p.ensure(30);
    sectionLabel("MENU SELECTIONS");
    data.menu.forEach((g) => {
      p.ensure(16);
      p.rect(MX, p.y - 1, 3, 10, MAROON);
      p.text(MX + 12, p.y, g.heading, 9.5, F_BOLD, BLACK);
      p.y -= 14;
      wrap(g.items, 92).forEach((row) => {
        p.ensure(12);
        p.text(MX + 12, p.y, row, 8.5, F_REG, BLACK);
        p.y -= 11;
      });
      p.y -= 6;
    });
  }

  /* Footer band — anchored to the bottom of the (last) page. */
  if (p.y < BOTTOM + 20) p.newPage();
  p.line(0, 78, PAGE_W, 78, CREAM, 0.8);
  p.rect(0, 30, PAGE_W, 44, CREAM);
  p.textCenter(PAGE_W / 2, 56, "Thank you for choosing Bhojpatra", 12, F_BOLD, MAROON);
  p.textCenter(
    PAGE_W / 2,
    41,
    "Premium Catering & Feasts   -   This is a computer-generated invoice and needs no signature.",
    8,
    F_REG,
    MAROON,
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

/* ── Shareable links ─────────────────────────────────────────────────────── */
// The whole invoice travels inside a URL-safe token so a link can be opened
// without any backend (see the public /bookings/invoice viewer). UTF-8 safe so
// occasion/venue text in any script survives the round-trip.

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(bin)
      : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 =
    s.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (s.length % 4)) % 4);
  const bin =
    typeof atob !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Serialise an invoice to a compact, URL-safe token. */
export function encodeInvoice(data: InvoiceData): string {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(data)));
}

/** Parse a token back into invoice data, or `null` if it is malformed. */
export function decodeInvoice(token: string): InvoiceData | null {
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(token)));
    if (
      !data ||
      typeof data.id !== "string" ||
      !Array.isArray(data.lines) ||
      !Array.isArray(data.menu)
    ) {
      return null;
    }
    return data as InvoiceData;
  } catch {
    return null;
  }
}

/** Full, shareable URL that renders this invoice in the public viewer. */
export function invoiceShareUrl(data: InvoiceData): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/bookings/invoice?d=${encodeInvoice(data)}`;
}

/** Resolve the actual font-family string behind the `.font-display` class
 *  (Ananda Neptouch 2, loaded via next/font under a hashed name) so it can be
 *  used in a `<canvas>` `font` string. */
function displayFontFamily(): string {
  const el = document.createElement("span");
  el.className = "font-display";
  el.style.cssText = "position:absolute;visibility:hidden";
  document.body.appendChild(el);
  const fam = getComputedStyle(el).fontFamily;
  el.remove();
  return fam || "serif";
}

/** Rasterise the brand mark — the pot/manuscript icon plus "bhojpatra" set in
 *  Ananda Neptouch — as a cream (#F0D09E) composite over the masthead maroon
 *  (#B92025), so it embeds as an opaque PDF image that blends into the band and
 *  carries the real display typeface (which the PDF's core fonts can't).
 *  Browser-only (needs a canvas); returns null otherwise, and the builder falls
 *  back to the plain text wordmark. */
async function loadMastheadLogo(): Promise<LogoBitmap | null> {
  if (typeof document === "undefined") return null;
  try {
    const icon = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("icon load failed"));
      im.src = "/bhojpatra-icon.png";
    });

    const S = 4; // supersample for crisp edges at ~30pt
    const HPT = 30; // rendered height in points
    const iconPx = 30 * S;
    const gapPx = 8 * S;
    const fontPx = 27 * S;
    const heightPx = HPT * S;

    const fam = displayFontFamily();
    const fontSpec = `${fontPx}px ${fam}`;
    if (document.fonts?.load) {
      try {
        await document.fonts.load(fontSpec, "bhojpatra");
      } catch {
        /* fall through to whatever face is ready */
      }
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = fontSpec;
    const textPx = Math.ceil(ctx.measureText("bhojpatra").width);

    canvas.width = iconPx + gapPx + textPx;
    canvas.height = heightPx;
    // Re-sizing the canvas resets the context, so re-apply everything.
    ctx.font = fontSpec;
    ctx.fillStyle = "#B92025"; // maroon band
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Icon: composite cream over maroon by the PNG's own alpha (the BrandIcon
    // mask treatment), vertically centred.
    const io = document.createElement("canvas");
    io.width = iconPx;
    io.height = iconPx;
    const ictx = io.getContext("2d");
    if (ictx) {
      ictx.drawImage(icon, 0, 0, iconPx, iconPx);
      const px = ictx.getImageData(0, 0, iconPx, iconPx);
      for (let i = 0; i < px.data.length; i += 4) {
        const a = px.data[i + 3] / 255;
        px.data[i] = Math.round(0xf0 * a + 0xb9 * (1 - a));
        px.data[i + 1] = Math.round(0xd0 * a + 0x20 * (1 - a));
        px.data[i + 2] = Math.round(0x9e * a + 0x25 * (1 - a));
        px.data[i + 3] = 255;
      }
      ctx.putImageData(px, 0, Math.round((heightPx - iconPx) / 2));
    }

    // Wordmark: cream Ananda text, edges blend against the maroon fill.
    ctx.fillStyle = "#F0D09E";
    ctx.textBaseline = "middle";
    ctx.fillText("bhojpatra", iconPx + gapPx, heightPx / 2 + S);

    const all = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bin = "";
    for (let i = 0; i < all.length; i += 4) {
      bin += String.fromCharCode(all[i], all[i + 1], all[i + 2]);
    }
    return { w: canvas.width, h: canvas.height, data: bin, ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
}

/** Trigger a browser download of the invoice as a PDF. */
export async function downloadInvoice(data: InvoiceData): Promise<void> {
  if (typeof window === "undefined") return;
  const logo = await loadMastheadLogo();
  const blob = new Blob([buildInvoicePdf(data, logo)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bhojpatra-Invoice-${data.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
