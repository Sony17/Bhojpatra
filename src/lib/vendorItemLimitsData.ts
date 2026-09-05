/**
 * Admin per-vendor dish-quota overrides — the shared shapes and pure helpers.
 *
 * The admin can raise or lower how many dishes a guest may pick from ONE
 * vendor's course on each feast band (Silver / Gold / Platinum), per vendor and
 * per course. These sit ABOVE the caterer's own `tierItems` (their dashboard
 * setting) and the platform's `packageCategoryItems`:
 *
 *   admin override → caterer's `tierItems` → `packageCategoryItems` → 1
 *
 * The override is applied server-side by merging into the `tierItems` the
 * wizard already consumes (`assembleMenuCategories` / `toPublicVendorProfile`),
 * so every existing quota read — pick counters, disabled dish cards, the
 * "0 = doesn't serve this course on this band" roster drop-out — enforces it
 * without knowing it exists. A band with no admin entry keeps the caterer's or
 * platform number.
 *
 * Client-safe on purpose: the admin editor reads these types and clamps with
 * the same helper the API route validates with, so nothing here may touch the
 * store (that's `vendorMenus.readVendorItemLimits` and the API route).
 */
import { TIER_ORDER, type VendorTier } from "@/lib/admin/types";

/** Settings-singleton key the overrides persist under (`settings` table). */
export const VENDOR_ITEM_LIMITS_KEY = "vendor-item-limits";

/** One course can hold at most this many dishes (`MAX_ITEMS_PER_SECTION` in
 *  `vendorMenus` aliases this), so no quota above it can ever be met. */
export const MAX_COURSE_QUOTA = 24;

/** Per-band quota for one course. `0` = guests can't pick this course from
 *  this vendor on that band (same meaning the caterer's own `tierItems` has). */
export type CourseTierLimits = Partial<Record<VendorTier, number>>;
/** category id → per-band quotas. */
export type VendorCourseLimits = Record<string, CourseTierLimits>;
/** vendor id → category id → per-band quotas — the whole stored blob. */
export type VendorItemLimits = Record<string, VendorCourseLimits>;

/** Coerce one quota to a whole number in `0..MAX_COURSE_QUOTA`, or `null` for
 *  anything that isn't a real number ("no override" — never a silent 0, which
 *  would hide the vendor from a course nobody asked to hide). */
export function normalizeCourseQuota(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), MAX_COURSE_QUOTA);
}

/** One course's overrides with junk dropped: unknown band keys, non-numbers,
 *  out-of-range values. `null` when nothing survives, so empty objects never
 *  reach the store. */
export function normalizeCourseLimits(raw: unknown): CourseTierLimits | null {
  if (!raw || typeof raw !== "object") return null;
  const out: CourseTierLimits = {};
  for (const tier of TIER_ORDER) {
    const n = normalizeCourseQuota((raw as Record<string, unknown>)[tier]);
    if (n !== null) out[tier] = n;
  }
  return Object.keys(out).length ? out : null;
}

/** The whole stored blob, shape-checked field by field — a hand-edited or
 *  half-written row must degrade to "fewer overrides", never crash a reader.
 *  Category ids are NOT validated here (that needs the taxonomy, which the
 *  write path checks); a stale id simply never matches a course again. */
export function normalizeVendorItemLimits(raw: unknown): VendorItemLimits {
  if (!raw || typeof raw !== "object") return {};
  const out: VendorItemLimits = {};
  for (const [vendorId, courses] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!vendorId || !courses || typeof courses !== "object") continue;
    const entry: VendorCourseLimits = {};
    for (const [catId, course] of Object.entries(
      courses as Record<string, unknown>,
    )) {
      const norm = normalizeCourseLimits(course);
      if (norm) entry[catId] = norm;
    }
    if (Object.keys(entry).length) out[vendorId] = entry;
  }
  return out;
}

/** A course's effective per-band quotas: the caterer's own numbers with the
 *  admin's laid on top (band by band — an admin entry wins its band, the rest
 *  keep the caterer's). `undefined` when neither set anything, so the key
 *  stays off the assembled vendor and the platform default applies. */
export function mergeCourseQuotas(
  own: CourseTierLimits | undefined,
  admin: CourseTierLimits | undefined,
): CourseTierLimits | undefined {
  const merged: CourseTierLimits = { ...own, ...admin };
  return Object.keys(merged).length ? merged : undefined;
}
