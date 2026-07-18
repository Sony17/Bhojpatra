/**
 * Invoice PDF generator.
 *
 * Renders a branded, boutique "TAX INVOICE" as a real PDF — no third-party
 * library. The builder supports measured text (Helvetica / Helvetica-Bold via
 * embedded AFM widths, so proportional text can be centred and right-aligned
 * exactly), letter-spacing, filled/alpha rectangles, stroked frames and rules,
 * Bézier circles, filled polygons (ornaments), rotated text, embedded images
 * and a faint image watermark, with automatic page breaks. The standard-14
 * fonts only cover Latin-1, so glyphs like ₹ are transliterated (₹ → "Rs ").
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
  /** Who the invoice is billed to — the customer's contact, captured at booking
   *  time. All optional so older stored invoices (saved before contact was on
   *  the invoice) still render; the "Bill To" block is hidden when all blank. */
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  occasion: string;
  eventDate: string;
  /** Meal period + clock time the feast is served at (e.g. "Dinner · 7:30 PM"),
   *  when the guest set one. Absent on orders saved before serving time. */
  servingTime?: string;
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
const BOTTOM = 92; // bottom margin (reserves room for the footer band)

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
  private alphas: number[] = []; // distinct fill-alpha values → ExtGState names
  private wm: { s: string; size: number; color: RGB; alpha: number } | null = null;
  private wmImg: { idx: number; w: number; h: number; alpha: number } | null = null;
  y = PAGE_H;

  private rgb(c: RGB, stroke = false): string {
    return `${c[0]} ${c[1]} ${c[2]} ${stroke ? "RG" : "rg"}`;
  }

  /** Register a fill/stroke alpha and return its ExtGState resource name. */
  private gsName(alpha: number): string {
    let i = this.alphas.indexOf(alpha);
    if (i < 0) {
      i = this.alphas.length;
      this.alphas.push(alpha);
    }
    return `GS${i}`;
  }

  /** Register an image XObject once and return its resource index (so a single
   *  bitmap — e.g. the watermark — can be painted on many pages without being
   *  re-embedded per page). */
  private registerImage(img: { w: number; h: number; data: string }): number {
    this.images.push(img);
    return this.images.length - 1;
  }

  /** Enable a faint 45° text watermark drawn behind the content of every page. */
  setWatermark(s: string, size: number, color: RGB, alpha: number) {
    this.wm = { s, size, color, alpha };
    this.stampWatermark();
  }

  /** Enable a faint brand-mark image (the pot) centred behind every page — the
   *  same watermark the site uses. Embedded once, re-stamped on every newPage. */
  setImageWatermark(img: LogoBitmap, targetH: number, alpha: number) {
    const idx = this.registerImage(img);
    this.wmImg = { idx, w: targetH * img.ratio, h: targetH, alpha };
    this.stampWatermark();
  }

  private stampWatermark() {
    if (this.wmImg) {
      const { idx, w, h, alpha } = this.wmImg;
      const x = (PAGE_W - w) / 2;
      const y = (PAGE_H - h) / 2;
      this.ops +=
        `q /${this.gsName(alpha)} gs ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ` +
        `${x.toFixed(2)} ${y.toFixed(2)} cm /Im${idx} Do Q\n`;
    }
    if (this.wm) {
      const { s, size, color, alpha } = this.wm;
      const cos = Math.SQRT1_2; // cos 45°
      const sin = Math.SQRT1_2; // sin 45° (rotate CCW, bottom-left → top-right)
      const w = measure(s, F_BOLD, size);
      const midY = size * 0.34; // ~half cap-height, to centre vertically
      const cx = PAGE_W / 2;
      const cy = PAGE_H / 2;
      const e = cx - (w / 2) * cos + midY * sin;
      const f = cy - (w / 2) * sin - midY * cos;
      this.ops +=
        `q /${this.gsName(alpha)} gs BT /${F_BOLD} ${size} Tf 0 Tc ${this.rgb(color)} ` +
        `${cos.toFixed(5)} ${sin.toFixed(5)} ${(-sin).toFixed(5)} ${cos.toFixed(5)} ` +
        `${e.toFixed(2)} ${f.toFixed(2)} Tm (${escapePdfText(toLatin1(s))}) Tj ET Q\n`;
    }
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

  /** Text rotated `deg` degrees about its own centre point (cx, cy). */
  textRotated(
    cx: number,
    cy: number,
    s: string,
    size: number,
    font: string,
    color: RGB,
    deg: number,
    tracking = 0,
  ) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const w = measure(s, font, size, tracking);
    const midY = size * 0.34;
    const e = cx - (w / 2) * cos + midY * sin;
    const f = cy - (w / 2) * sin - midY * cos;
    this.ops +=
      `BT /${font} ${size} Tf ${tracking} Tc ${this.rgb(color)} ` +
      `${cos.toFixed(5)} ${sin.toFixed(5)} ${(-sin).toFixed(5)} ${cos.toFixed(5)} ` +
      `${e.toFixed(2)} ${f.toFixed(2)} Tm (${escapePdfText(toLatin1(s))}) Tj ET\n`;
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops += `${this.rgb(color)} ${x} ${y} ${w} ${h} re f\n`;
  }

  /** Filled rectangle with a fill alpha — for faint cream tints (zebra rows,
   *  keylines) that stay a true brand hex with only opacity applied. */
  rectAlpha(x: number, y: number, w: number, h: number, color: RGB, alpha: number) {
    this.ops += `q /${this.gsName(alpha)} gs ${this.rgb(color)} ${x} ${y} ${w} ${h} re f Q\n`;
  }

  /** Stroked (outline-only) rectangle — for cards and decorative frames. */
  rectS(x: number, y: number, w: number, h: number, color: RGB, width = 0.8) {
    this.ops += `${this.rgb(color, true)} ${width} w ${x} ${y} ${w} ${h} re S\n`;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) {
    this.ops += `${this.rgb(color, true)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  /** Circle via four cubic Béziers — stroked (ring) or filled (dot/seal). */
  circle(cx: number, cy: number, r: number, color: RGB, width = 0.8, fill = false) {
    const k = r * 0.5522847498;
    const f = (n: number) => n.toFixed(2);
    this.ops +=
      (fill ? `${this.rgb(color)} ` : `${this.rgb(color, true)} ${width} w `) +
      `${f(cx + r)} ${f(cy)} m ` +
      `${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
      `${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c ` +
      `${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
      `${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c ` +
      (fill ? "f\n" : "S\n");
  }

  /** Fill a closed polygon (used for the little diamond ornaments). */
  poly(pts: Array<[number, number]>, color: RGB) {
    let s = `${this.rgb(color)} ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} m `;
    for (let i = 1; i < pts.length; i++) s += `${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} l `;
    this.ops += s + "h f\n";
  }

  /** A small solid diamond ornament centred at (cx, cy). */
  diamond(cx: number, cy: number, r: number, color: RGB) {
    this.poly([[cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy]], color);
  }

  /** Draw a pre-rasterised RGB image; (x, y) is the bottom-left corner and
   *  (w, h) the placement size in points. */
  image(x: number, y: number, w: number, h: number, img: { w: number; h: number; data: string }) {
    const idx = this.registerImage(img);
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
    this.stampWatermark();
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

    // Alpha graphics states (inline dicts) for the faint watermark and tints.
    const xgs = this.alphas.length
      ? "/ExtGState << " +
        this.alphas.map((a, i) => `/GS${i} << /ca ${a} /CA ${a} >>`).join(" ") +
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
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> ${xobj}${xgs}>> ` +
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
  watermark?: LogoBitmap | null,
  footerLogo?: LogoBitmap | null,
): Uint8Array<ArrayBuffer> {
  const p = new Pdf();

  /* Faint brand watermark behind every page. The pot mark (the same one the
     site uses) when it could be rasterised, else a diagonal wordmark. Both are
     a real brand hex with only opacity applied (per the brand rules). */
  if (watermark) p.setImageWatermark(watermark, 400, 0.05);
  else p.setWatermark("bhojpatra", 92, MAROON, 0.05);

  /* Masthead — full-bleed maroon band with a slim cream top rule and a crafted
     double-hairline inset frame. */
  const HEAD = 108;
  p.rect(0, PAGE_H - HEAD, PAGE_W, HEAD, MAROON);
  p.rect(0, PAGE_H - 5, PAGE_W, 3, CREAM); // gilt top edge
  p.rectS(16, PAGE_H - HEAD + 12, PAGE_W - 32, HEAD - 26, CREAM, 0.8);
  p.rectS(19, PAGE_H - HEAD + 15, PAGE_W - 38, HEAD - 32, CREAM, 0.3);

  /* Brand mark: the cream logo when it could be rasterised, else the wordmark. */
  if (logo) {
    const h = 30;
    p.image(MX + 4, PAGE_H - 76, h * logo.ratio, h, logo);
  } else {
    p.text(MX + 4, PAGE_H - 60, "bhojpatra", 30, F_BOLD, CREAM);
  }
  p.text(MX + 6, PAGE_H - 92, "PREMIUM CATERING & FEASTS", 8, F_REG, WHITE, 2.4);

  /* Invoice meta (right) with a hairline under the "TAX INVOICE" title. */
  const titleY = PAGE_H - 54;
  p.textRight(RIGHT - 4, titleY, "TAX INVOICE", 15, F_BOLD, WHITE);
  p.line(RIGHT - 4 - measure("TAX INVOICE", F_BOLD, 15), titleY - 6, RIGHT - 4, titleY - 6, CREAM, 0.8);
  p.textRight(RIGHT - 4, PAGE_H - 76, `Invoice No.  ${data.id}`, 9, F_REG, CREAM);
  p.textRight(RIGHT - 4, PAGE_H - 90, `Date  ${data.dateLabel}`, 9, F_REG, CREAM);

  /* Ornamental divider under the masthead — hairline rule split by a diamond. */
  p.y = PAGE_H - HEAD - 22;
  ornamentRule(p, p.y);
  p.y -= 20;

  /* Section helper — a diamond tick, small-caps maroon label, accent underline. */
  const sectionLabel = (s: string) => {
    p.diamond(MX + 2.5, p.y + 3, 2.4, MAROON);
    p.text(MX + 11, p.y, s, 9, F_BOLD, MAROON, 1.8);
    const lw = measure(s, F_BOLD, 9, 1.8);
    p.line(MX + 11, p.y - 6, MX + 11 + lw, p.y - 6, MAROON, 1.2);
    p.y -= 21;
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
  p.y -= 27;
  field(MX, "EVENT DATE", data.eventDate);
  field(COL2, "GUESTS", nf.format(data.guests));
  p.y -= 27;
  field(MX, "CITY", data.city);
  field(COL2, "VENUE", data.venue);
  if (data.servingTime) {
    p.y -= 27;
    field(MX, "SERVING TIME", data.servingTime);
  }
  p.y -= 27;

  /* Bill To — the customer's contact, when captured. Skipped entirely for older
     invoices that carry no contact so the layout doesn't leave an empty block. */
  if (data.customerName || data.customerPhone || data.customerEmail) {
    sectionLabel("BILL TO");
    if (data.customerName) {
      p.text(MX, p.y, data.customerName, 11, F_BOLD, BLACK);
      p.y -= 15;
    }
    const contact = [data.customerPhone, data.customerEmail]
      .filter(Boolean)
      .join("   -   ");
    if (contact) {
      p.text(MX, p.y, contact, 9.5, F_REG, BLACK);
      p.y -= 15;
    }
    p.y -= 17;
  }

  /* Itemised charges table — cream header, faint cream zebra rows. */
  sectionLabel("CHARGES");
  p.rect(MX, p.y - 7, RIGHT - MX, 22, CREAM);
  p.text(MX + 12, p.y, "DESCRIPTION", 8.5, F_BOLD, MAROON, 1);
  p.textRight(RIGHT - 12, p.y, "AMOUNT", 8.5, F_BOLD, MAROON);
  p.y -= 26;

  data.lines.forEach((ln, i) => {
    p.ensure(17);
    if (i % 2 === 1) p.rectAlpha(MX, p.y - 5.5, RIGHT - MX, 17, CREAM, 0.35);
    p.text(MX + 12, p.y, ln.label, 9.5, F_REG, BLACK);
    p.textRight(RIGHT - 12, p.y, money(ln.amount), 9.5, F_REG, BLACK);
    p.y -= 17;
  });
  p.line(MX, p.y + 6, RIGHT, p.y + 6, CREAM, 0.8);
  p.y -= 10;

  /* Totals stack (right column). */
  const labelX = 372;
  const totalRow = (label: string, value: string, color: RGB = BLACK) => {
    p.ensure(15);
    p.text(labelX, p.y, label, 9.5, F_REG, color);
    p.textRight(RIGHT - 12, p.y, value, 9.5, F_REG, color);
    p.y -= 16;
  };
  totalRow("Subtotal", money(data.subtotal));
  if (data.addOnsTotal > 0) totalRow("Add-ons", money(data.addOnsTotal));
  if (data.discount > 0) totalRow("Discount", `- ${money(data.discount)}`, MAROON);
  totalRow("GST (18%)", money(data.gst));
  p.y -= 8;

  /* Grand-total showpiece — full-width maroon band with an inner cream keyline
     and the oversized amount. */
  p.ensure(72);
  const bandTop = p.y;
  const BANDH = 54;
  p.rect(MX, bandTop - BANDH, RIGHT - MX, BANDH, MAROON);
  p.rectS(MX + 6, bandTop - BANDH + 6, RIGHT - MX - 12, BANDH - 12, CREAM, 0.4);
  p.text(MX + 20, bandTop - 22, "GRAND TOTAL", 12, F_BOLD, CREAM, 2.2);
  p.text(MX + 20, bandTop - 38, "Total amount for your event", 8, F_REG, WHITE);
  p.textRight(RIGHT - 20, bandTop - 35, money(data.grandTotal), 27, F_BOLD, WHITE);
  p.y = bandTop - BANDH - 22;

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
    /* A little tilted brand medallion, stamped like a wax seal. */
    stampSeal(p, balX + cardW - 30, cardTop - CARDH / 2);
  }
  p.y = cardTop - CARDH - 20;

  /* Menu selections — kept together as one block: if the whole thing won't fit
     under the payment cards, it breaks cleanly to the next page. */
  if (data.menu.length > 0) {
    let menuH = 21; // section label
    for (const g of data.menu) menuH += 13 + wrap(g.items, 92).length * 11 + 5;
    p.ensure(menuH);
    sectionLabel("MENU SELECTIONS");
    data.menu.forEach((g) => {
      p.ensure(16);
      p.rect(MX, p.y - 1, 3, 10, MAROON);
      p.text(MX + 12, p.y, g.heading, 9.5, F_BOLD, BLACK);
      p.y -= 13;
      wrap(g.items, 92).forEach((row) => {
        p.ensure(12);
        p.text(MX + 12, p.y, row, 8.5, F_REG, BLACK);
        p.y -= 11;
      });
      p.y -= 5;
    });
  }

  /* Footer — a cream band signed off with the real brand logo sitting on the
     white page just above the band, anchored to the bottom of the (last) page.
     Falls back to the "B" medallion when the logo couldn't be rasterised. */
  if (p.y < 108) p.newPage();
  p.rect(0, 24, PAGE_W, 46, CREAM);
  p.line(MX, 70, RIGHT, 70, MAROON, 0.4);
  if (footerLogo) {
    const lh = 20;
    const lw = lh * footerLogo.ratio;
    p.image((PAGE_W - lw) / 2, 76, lw, lh, footerLogo);
  } else {
    brandMedallion(p, PAGE_W / 2, 72);
  }
  p.textCenter(PAGE_W / 2, 46, "Thank you for choosing Bhojpatra", 11.5, F_BOLD, MAROON);
  p.textCenter(
    PAGE_W / 2,
    33,
    "Premium Catering & Feasts   -   This is a computer-generated invoice and needs no signature.",
    8,
    F_REG,
    MAROON,
  );

  return p.finish();
}

/** Hairline rule across the content width, broken by a centred diamond. */
function ornamentRule(p: Pdf, y: number) {
  const cx = PAGE_W / 2;
  p.line(MX, y, cx - 13, y, MAROON, 0.5);
  p.line(cx + 13, y, RIGHT, y, MAROON, 0.5);
  p.diamond(cx - 7, y, 1.8, MAROON);
  p.diamond(cx + 7, y, 1.8, MAROON);
  p.diamond(cx, y, 3, MAROON);
}

/** A small tilted "seal" — concentric rings + monogram, like a wax stamp. */
function stampSeal(p: Pdf, cx: number, cy: number) {
  p.circle(cx, cy, 15, MAROON, 1.2);
  p.circle(cx, cy, 11.5, MAROON, 0.4);
  p.textRotated(cx, cy - 5, "B", 16, F_BOLD, MAROON, -12);
}

/** The footer brand medallion — a clean white disc with double maroon rings and
 *  the "B" monogram, sitting like a wax seal on the band's top edge. */
function brandMedallion(p: Pdf, cx: number, cy: number) {
  p.circle(cx, cy, 13, WHITE, 0, true);
  p.circle(cx, cy, 13, MAROON, 1.1);
  p.circle(cx, cy, 9.5, MAROON, 0.4);
  p.textCenter(cx, cy - 4.5, "B", 14, F_BOLD, MAROON);
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

/** Load a same-origin image element, resolving once decoded. */
function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`image load failed: ${src}`));
    im.src = src;
  });
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
    const icon = await loadImageEl("/bhojpatra-icon.png");

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

/** Rasterise the brand mark (pot icon + "bhojpatra" wordmark) in MAROON over
 *  WHITE — the page colour just above the cream footer band — so the invoice is
 *  signed off with the real logo rather than a generic "B" medallion. The ink /
 *  paper are swapped versus {@link loadMastheadLogo}. Browser-only; returns null
 *  otherwise, and the builder keeps the medallion fallback. */
async function loadFooterLogo(): Promise<LogoBitmap | null> {
  if (typeof document === "undefined") return null;
  try {
    const icon = await loadImageEl("/bhojpatra-icon.png");

    const S = 4; // supersample for crisp edges
    const HPT = 24; // rendered height in points
    const iconPx = 24 * S;
    const gapPx = 7 * S;
    const fontPx = 21 * S;
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
    ctx.fillStyle = "#FFFFFF"; // white page above the band
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Icon: composite maroon over white by the PNG's own alpha, vertically
    // centred (a maroon silhouette of the pot mark).
    const io = document.createElement("canvas");
    io.width = iconPx;
    io.height = iconPx;
    const ictx = io.getContext("2d");
    if (ictx) {
      ictx.drawImage(icon, 0, 0, iconPx, iconPx);
      const px = ictx.getImageData(0, 0, iconPx, iconPx);
      for (let i = 0; i < px.data.length; i += 4) {
        const a = px.data[i + 3] / 255;
        px.data[i] = Math.round(0xb9 * a + 0xff * (1 - a));
        px.data[i + 1] = Math.round(0x20 * a + 0xff * (1 - a));
        px.data[i + 2] = Math.round(0x25 * a + 0xff * (1 - a));
        px.data[i + 3] = 255;
      }
      ctx.putImageData(px, 0, Math.round((heightPx - iconPx) / 2));
    }

    // Wordmark: maroon Ananda text, edges blend against the white fill.
    ctx.fillStyle = "#B92025";
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

/** Rasterise the brand pot (the site-wide watermark asset) into a faint maroon
 *  mark composited over white, using the PNG's own alpha as the coverage mask.
 *  Embedded once and stamped behind every page at low opacity. Browser-only;
 *  returns null otherwise so the builder falls back to the text watermark. */
async function loadWatermarkPot(): Promise<LogoBitmap | null> {
  if (typeof document === "undefined") return null;
  try {
    const img = await loadImageEl("/watermark-pot.png");
    const h = 300; // faint, so a modest raster keeps the PDF small
    const w = Math.max(1, Math.round(h * (img.width / img.height)));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const px = ctx.getImageData(0, 0, w, h).data;
    let bin = "";
    for (let i = 0; i < px.length; i += 4) {
      // Maroon where the pot is opaque, white where it is transparent — the
      // page paints the whole bitmap at a low alpha, so only the shape shows.
      const a = px[i + 3] / 255;
      const r = Math.round(0xb9 * a + 0xff * (1 - a));
      const g = Math.round(0x20 * a + 0xff * (1 - a));
      const b = Math.round(0x25 * a + 0xff * (1 - a));
      bin += String.fromCharCode(r, g, b);
    }
    return { w, h, data: bin, ratio: w / h };
  } catch {
    return null;
  }
}

/** Trigger a browser download of the invoice as a PDF. */
export async function downloadInvoice(data: InvoiceData): Promise<void> {
  if (typeof window === "undefined") return;
  const [logo, watermark, footerLogo] = await Promise.all([
    loadMastheadLogo(),
    loadWatermarkPot(),
    loadFooterLogo(),
  ]);
  const blob = new Blob([buildInvoicePdf(data, logo, watermark, footerLogo)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bhojpatra-Invoice-${data.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
