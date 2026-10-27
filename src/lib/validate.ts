/**
 * Shared field validators, matching the rules already used by the leads route
 * (`src/app/api/leads/route.ts`) so the whole app validates contact details the
 * same way.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian mobile: 10 digits starting 6–9. Run `normalizePhone` first. */
export const PHONE_RE = /^[6-9]\d{9}$/;

/** Indian GSTIN: 15 chars — state (2) + PAN (10) + entity (1) + Z + check (1). */
export const GST_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Strip spaces/dashes and an optional +91 / 0091 / 91 / 0 prefix. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
}

export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}

/** Accepts a raw phone string; validates after normalizing. */
export function isValidPhone(v: unknown): v is string {
  return typeof v === "string" && PHONE_RE.test(normalizePhone(v.trim()));
}

/** Uppercase and strip spaces from a GSTIN. */
export function normalizeGst(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

/** Accepts a raw GSTIN string; validates after normalizing. */
export function isValidGst(v: unknown): v is string {
  return typeof v === "string" && GST_RE.test(normalizeGst(v.trim()));
}

/** Indian PAN: 10 chars — 5 letters, 4 digits, 1 letter (ABCDE1234F). */
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Uppercase and strip spaces from a PAN. */
export function normalizePan(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

export function isValidPan(v: unknown): v is string {
  return typeof v === "string" && PAN_RE.test(normalizePan(v.trim()));
}

/** The PAN a GSTIN is issued against (characters 3–12), or "" when the GSTIN
 *  is malformed. A GSTIN and the PAN filed beside it must agree. */
export function panOfGstin(gstin: string): string {
  const g = normalizeGst(gstin);
  return GST_RE.test(g) ? g.slice(2, 12) : "";
}

/** Strip spaces/dashes from an Aadhaar number. */
export function normalizeAadhaar(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

// Verhoeff checksum tables — UIDAI's check digit on every Aadhaar number.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** Aadhaar: 12 digits, never starting 0/1, with a valid Verhoeff check digit. */
export function isValidAadhaar(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const n = normalizeAadhaar(v.trim());
  if (!/^[2-9]\d{11}$/.test(n)) return false;
  let c = 0;
  n.split("").reverse().forEach((ch, i) => {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(ch)]];
  });
  return c === 0;
}

/** Parse the shared list-query params (`?q&status&city&method&tier&page&pageSize`)
 *  off a request URL. Values default sensibly; callers pass the rest through to
 *  their `query*` helper. */
export function parseListQuery(url: string): {
  q: string;
  status: string;
  city: string;
  method: string;
  tier: string;
  type: string;
  source: string;
  page: number;
  pageSize: number;
  hasQuery: boolean;
} {
  const sp = new URL(url).searchParams;
  const num = (v: string | null, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
  };
  return {
    q: sp.get("q") ?? "",
    status: sp.get("status") ?? "All",
    city: sp.get("city") ?? "All",
    method: sp.get("method") ?? "All",
    tier: sp.get("tier") ?? "All",
    type: sp.get("type") ?? "All",
    source: sp.get("source") ?? "All",
    page: num(sp.get("page"), 1),
    pageSize: num(sp.get("pageSize"), 8),
    // True when the caller passed any filter/pagination param — lets list
    // handlers stay backward-compatible (bare list) when none is present.
    hasQuery: [
      "q",
      "status",
      "city",
      "method",
      "tier",
      "type",
      "source",
      "page",
      "pageSize",
    ].some((k) => sp.has(k)),
  };
}
