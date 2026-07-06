/**
 * Coupon store.
 *
 * Backs the admin "Coupon Manager". Coupons are hard-deletable (they carry no
 * financial history), so the DELETE route calls `store.remove`. Seeded from the
 * former mock list on first empty read.
 */
import path from "path";
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type { AdminCoupon, CouponStatus, Paginated } from "@/lib/admin/types";
import { adminCoupons as SEED_COUPONS } from "@/lib/admin/mockData";

export interface CouponRecord extends AdminCoupon {
  createdAt: string;
}

/** Query params for the coupon list (mirrors the customer/booking queries). */
export interface CouponQuery {
  q?: string;
  status?: CouponStatus | "All";
  page?: number;
  pageSize?: number;
}

export const COUPONS_STORE = path.join(process.cwd(), "data", "coupons.json");

const store = createStore<CouponRecord>({
  table: "coupons",
  file: COUPONS_STORE,
  idField: "id",
});

export const COUPON_STATUSES: CouponStatus[] = ["Active", "Inactive"];

export function readCoupons(): Promise<CouponRecord[]> {
  return store.list();
}

export function getCoupon(id: string): Promise<CouponRecord | null> {
  return store.get(id);
}

export function upsertCoupon(rec: CouponRecord): Promise<void> {
  return store.upsert(rec);
}

export function removeCoupon(id: string): Promise<void> {
  return store.remove(id);
}

export function newCouponId(): string {
  return `CPN-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function ensureSeededCoupons(): Promise<CouponRecord[]> {
  const rows = await store.list();
  if (rows.length) return rows;
  const seeded: CouponRecord[] = SEED_COUPONS.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
  }));
  await store.upsertMany(seeded);
  return seeded;
}

export function queryCoupons(
  params: CouponQuery,
  source: CouponRecord[],
): Paginated<AdminCoupon> {
  const { q = "", status = "All", page = 1, pageSize = 8 } = params;
  const needle = q.trim().toLowerCase();
  const filtered = source.filter((c) => {
    const matchesQ =
      !needle ||
      c.code.toLowerCase().includes(needle) ||
      c.label.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || c.status === status;
    return matchesQ && matchesStatus;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize).map(toAdminCoupon),
    page,
    pageSize,
    total,
  };
}

export function toAdminCoupon(r: CouponRecord): AdminCoupon {
  return {
    id: r.id,
    code: r.code,
    label: r.label,
    percent: r.percent,
    cap: r.cap,
    eligibility: r.eligibility,
    startsAt: r.startsAt,
    expiresAt: r.expiresAt,
    status: r.status,
  };
}

export function isCouponStatus(v: unknown): v is CouponStatus {
  return v === "Active" || v === "Inactive";
}

export interface CouponValidation {
  ok: boolean;
  error?: string;
  value?: Omit<AdminCoupon, "id">;
}

/**
 * Validate a coupon create/update body. `partial` allows an update that only
 * carries some fields (the caller merges onto the existing record).
 */
export function validateCoupon(
  body: Record<string, unknown>,
  partial = false,
): CouponValidation {
  const out: Partial<Omit<AdminCoupon, "id">> = {};

  // code
  if (body.code !== undefined || !partial) {
    if (typeof body.code !== "string" || !body.code.trim())
      return { ok: false, error: "Coupon code is required." };
    out.code = body.code.trim().toUpperCase();
  }
  // label
  if (body.label !== undefined || !partial) {
    if (typeof body.label !== "string" || !body.label.trim())
      return { ok: false, error: "A description (label) is required." };
    out.label = body.label.trim();
  }
  // percent 1..100
  if (body.percent !== undefined || !partial) {
    const pct = Number(body.percent);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100)
      return { ok: false, error: "Discount percent must be between 1 and 100." };
    out.percent = Math.round(pct);
  }
  // cap >= 0
  if (body.cap !== undefined || !partial) {
    const cap = Number(body.cap);
    if (!Number.isFinite(cap) || cap < 0)
      return { ok: false, error: "Cap must be zero or more." };
    out.cap = Math.round(cap);
  }
  if (body.eligibility !== undefined || !partial) {
    out.eligibility =
      typeof body.eligibility === "string" && body.eligibility.trim()
        ? body.eligibility.trim()
        : "All occasions";
  }
  if (body.startsAt !== undefined || !partial) {
    out.startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  }
  if (body.expiresAt !== undefined || !partial) {
    out.expiresAt = typeof body.expiresAt === "string" ? body.expiresAt : "";
  }
  if (body.status !== undefined || !partial) {
    out.status = isCouponStatus(body.status) ? body.status : "Active";
  }
  return { ok: true, value: out as Omit<AdminCoupon, "id"> };
}
