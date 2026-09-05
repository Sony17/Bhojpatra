/**
 * Admin dish-quota overrides — what survives normalization on the way into the
 * store, and how an override lands on top of a caterer's own quotas.
 *
 * Run with `npx tsx --test src/lib/vendorItemLimitsData.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COURSE_QUOTA,
  mergeCourseQuotas,
  normalizeCourseLimits,
  normalizeCourseQuota,
  normalizeVendorItemLimits,
} from "@/lib/vendorItemLimitsData";

/* ── Single-value clamping ────────────────────────────────────────────── */

test("a quota is a whole number in range — everything else is 'no override'", () => {
  assert.equal(normalizeCourseQuota(3), 3);
  assert.equal(normalizeCourseQuota(0), 0); // 0 is meaningful: course off
  assert.equal(normalizeCourseQuota(2.6), 3);
  assert.equal(normalizeCourseQuota(99), MAX_COURSE_QUOTA);
  assert.equal(normalizeCourseQuota(-1), null);
  // Strings never coerce — "" reading as 0 would silently hide a course.
  assert.equal(normalizeCourseQuota("2"), null);
  assert.equal(normalizeCourseQuota(null), null);
  assert.equal(normalizeCourseQuota(undefined), null);
  assert.equal(normalizeCourseQuota(NaN), null);
});

test("a course keeps only real band entries, and empties vanish", () => {
  assert.deepEqual(
    normalizeCourseLimits({ Silver: 2, Gold: -4, Copper: 9, Platinum: 0 }),
    { Silver: 2, Platinum: 0 },
  );
  assert.equal(normalizeCourseLimits({ Gold: "lots" }), null);
  assert.equal(normalizeCourseLimits("nope"), null);
});

/* ── The whole stored blob ────────────────────────────────────────────── */

test("a broken stored blob degrades to fewer overrides, never a crash", () => {
  assert.deepEqual(normalizeVendorItemLimits(undefined), {});
  assert.deepEqual(normalizeVendorItemLimits([1, 2]), {});
  assert.deepEqual(
    normalizeVendorItemLimits({
      "vl-3": { main: { Gold: 4 }, sweets: "junk" },
      "vl-4": { starters: { Gold: "junk" } }, // nothing survives → vendor drops
      "": { main: { Gold: 1 } }, // no vendor id → dropped
    }),
    { "vl-3": { main: { Gold: 4 } } },
  );
});

/* ── Merging onto the caterer's own quotas ────────────────────────────── */

test("an admin entry wins its band; untouched bands keep the caterer's", () => {
  assert.deepEqual(
    mergeCourseQuotas({ Silver: 2, Gold: 5 }, { Gold: 3 }),
    { Silver: 2, Gold: 3 },
  );
  // Admin can grant a quota on a band the caterer never configured…
  assert.deepEqual(mergeCourseQuotas(undefined, { Platinum: 6 }), {
    Platinum: 6,
  });
  // …and an admin 0 turns a course off even when the caterer allows it.
  assert.deepEqual(mergeCourseQuotas({ Gold: 5 }, { Gold: 0 }), { Gold: 0 });
  // Nothing set anywhere → undefined, so the platform default applies.
  assert.equal(mergeCourseQuotas(undefined, undefined), undefined);
  assert.equal(mergeCourseQuotas({}, {}), undefined);
});
