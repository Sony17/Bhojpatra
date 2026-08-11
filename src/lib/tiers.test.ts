/**
 * Feast-band maths — how what a caterer types per band turns into what a guest
 * is actually offered, and what the save path repairs on the way in.
 *
 * Run with `npx tsx --test src/lib/tiers.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dishOnTier,
  effectiveTiers,
  ownCourseQuota,
  pruneDishTiers,
  pruneTierMap,
  tierRate,
  tiersForPrice,
} from "@/lib/tiers";
import { pruneMenuBands, type VendorMenuSection } from "@/lib/vendorMenus";

/* ── Which bands a caterer is browsed in ──────────────────────────────── */

test("bands fall back to the price-derived ones when none were picked", () => {
  assert.deepEqual(effectiveTiers(undefined, 799), ["Silver", "Gold"]);
  assert.deepEqual(effectiveTiers([], 1600), ["Gold", "Platinum"]);
  // Their own pick wins over price, and comes back in canonical order.
  assert.deepEqual(effectiveTiers(["Platinum", "Silver"], 799), [
    "Silver",
    "Platinum",
  ]);
  assert.deepEqual(tiersForPrice(1100), ["Silver", "Gold", "Platinum"]);
});

/* ── Per-dish bands ───────────────────────────────────────────────────── */

test("a dish with no band list is served everywhere", () => {
  assert.equal(dishOnTier({}, "Silver"), true);
  assert.equal(dishOnTier({ tiers: [] }, "Silver"), true);
});

test("a restricted dish is kept off the bands it doesn't name", () => {
  const raan = { tiers: ["Platinum" as const] };
  assert.equal(dishOnTier(raan, "Silver"), false);
  assert.equal(dishOnTier(raan, "Platinum"), true);
  // Off a band entirely (Single Stall) every dish is served.
  assert.equal(dishOnTier(raan, null), true);
});

test("a band list covering every band the vendor sells isn't stored", () => {
  const bands = ["Silver", "Gold"] as const;
  assert.equal(pruneDishTiers(["Silver", "Gold"], bands), undefined);
  assert.deepEqual(pruneDishTiers(["Gold"], bands), ["Gold"]);
  // A band they've stopped selling drops out; what's left still restricts.
  assert.deepEqual(pruneDishTiers(["Gold", "Platinum"], bands), ["Gold"]);
  // Nothing left would hide the dish everywhere — read as "no restriction".
  assert.equal(pruneDishTiers(["Platinum"], bands), undefined);
});

/* ── Per-band rate ────────────────────────────────────────────────────── */

test("a band bills its own rate, else the course's flat rate", () => {
  const section = { perPlate: 120, tierPerPlate: { Platinum: 260 } };
  assert.equal(tierRate(section, "Platinum"), 260);
  assert.equal(tierRate(section, "Silver"), 120);
  assert.equal(tierRate(section, null), 120);
  assert.equal(tierRate({ perPlate: 120 }, "Platinum"), 120);
});

/* ── Per-band dish quota ──────────────────────────────────────────────── */

test("off a band, the quota is the most generous one published", () => {
  const quotas = { Silver: 0, Gold: 2, Platinum: 6 };
  assert.equal(ownCourseQuota(quotas, "Silver"), 0);
  assert.equal(ownCourseQuota(quotas, "Gold"), 2);
  // Single Stall browses unfiltered, so a 0 on one band mustn't hide the stall.
  assert.equal(ownCourseQuota(quotas, null), 6);
  assert.equal(ownCourseQuota(undefined, "Gold"), undefined);
  assert.equal(ownCourseQuota({ Silver: 0 }, null), 0);
});

test("band maps drop the bands a caterer no longer sells", () => {
  const kept = pruneTierMap({ Silver: 2, Platinum: 6 }, ["Silver", "Gold"]);
  assert.deepEqual(kept, { Silver: 2 });
  assert.equal(pruneTierMap({ Platinum: 6 }, ["Silver"]), undefined);
});

/* ── The save-path repair ─────────────────────────────────────────────── */

const course = (over: Partial<VendorMenuSection> = {}): VendorMenuSection => ({
  categoryId: "starters",
  perPlate: 120,
  items: [
    { name: "Paneer Tikka", diet: "veg" },
    { name: "Hara Bhara Kebab", diet: "veg" },
    { name: "Galouti", diet: "non-veg", tiers: ["Platinum"] },
  ],
  ...over,
});

test("a quota bigger than the dishes on that band is capped", () => {
  // Six asked for on Platinum, but only three dishes exist at all.
  const [s] = pruneMenuBands([course({ tierItems: { Platinum: 6 } })], [
    "Gold",
    "Platinum",
  ]);
  assert.equal(s.tierItems?.Platinum, 3);
});

test("a dish kept off a band doesn't count towards that band's quota", () => {
  // Gold asks for 3, but the Platinum-only Galouti isn't on Gold — so 2.
  const [s] = pruneMenuBands([course({ tierItems: { Gold: 3 } })], [
    "Gold",
    "Platinum",
  ]);
  assert.equal(s.tierItems?.Gold, 2);
});

test("a course with no dishes on a band is capped to zero there", () => {
  const [s] = pruneMenuBands(
    [
      course({
        items: [{ name: "Galouti", diet: "non-veg", tiers: ["Platinum"] }],
        tierItems: { Gold: 2 },
      }),
    ],
    ["Gold", "Platinum"],
  );
  // 0 is the record saying "I don't serve this course on Gold" — the wizard
  // drops the stall from that roster rather than showing an unfillable course.
  assert.equal(s.tierItems?.Gold, 0);
});

test("data for a band the caterer stopped selling is dropped", () => {
  const [s] = pruneMenuBands(
    [
      course({
        tierItems: { Silver: 2, Platinum: 6 },
        tierPerPlate: { Silver: 90, Platinum: 260 },
      }),
    ],
    ["Gold", "Platinum"],
  );
  assert.deepEqual(Object.keys(s.tierItems ?? {}), ["Platinum"]);
  assert.deepEqual(s.tierPerPlate, { Platinum: 260 });
  // The Platinum-only dish is still restricted here (Gold is also sold)…
  assert.deepEqual(s.items[2].tiers, ["Platinum"]);
});

test("a dish restricted to every band still sold loses its list", () => {
  const [s] = pruneMenuBands([course()], ["Platinum"]);
  // Only Platinum is sold, so "Platinum only" restricts nothing any more.
  assert.equal(s.items[2].tiers, undefined);
});

test("an untouched menu comes back untouched", () => {
  const plain = course({ items: [{ name: "Paneer Tikka", diet: "veg" }] });
  assert.deepEqual(pruneMenuBands([plain], ["Silver", "Gold"]), [plain]);
});
