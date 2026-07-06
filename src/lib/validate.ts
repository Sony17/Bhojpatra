/**
 * Shared field validators, matching the rules already used by the leads route
 * (`src/app/api/leads/route.ts`) so the whole app validates contact details the
 * same way.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian mobile: 10 digits starting 6–9. Run `normalizePhone` first. */
export const PHONE_RE = /^[6-9]\d{9}$/;

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
