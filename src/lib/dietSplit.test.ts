/**
 * Craft-my-plate maths — how a guest's veg / non-veg headcount turns into what
 * they're allowed to be shown, and the invariants the strict filters rest on.
 *
 * Run with `npx tsx --test src/lib/dietSplit.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREF_BOTH,
  PREF_NON_VEG,
  PREF_PURE_VEG,
  clampNonVeg,
  dishAllowed,
  fixedSpreadFits,
  foodPreferenceForSplit,
  kitchenFitsSplit,
  resolveNonVeg,
  splitSummary,
  vegCount,
} from "@/lib/dietSplit";

const veg = { diet: "veg" as const };
const nonVeg = { diet: "non-veg" as const };

/* ── Deriving the split ───────────────────────────────────────────────── */

test("the two extremes ignore any dialled-in mix", () => {
  // Whatever the guest once dialled in, the label decides these outright.
  assert.equal(resolveNonVeg(PREF_PURE_VEG, 40, 100), 0);
  assert.equal(resolveNonVeg(PREF_NON_VEG, 40, 100), 100);
  // And they follow a changed headcount rather than going stale.
  assert.equal(resolveNonVeg(PREF_NON_VEG, 40, 250), 250);
});

test("no preference means no split, so nothing is ever filtered", () => {
  assert.equal(resolveNonVeg("", null, 100), null);
  assert.equal(resolveNonVeg("", 40, 100), null);
});

test('"Both" keeps a genuinely mixed count and clamps it into the headcount', () => {
  assert.equal(resolveNonVeg(PREF_BOTH, 40, 100), 40);
  // Shrinking the party can't leave more non-veg eaters than guests. 200 of
  // 120 would otherwise read as a mixed event with negative veg guests.
  assert.equal(resolveNonVeg(PREF_BOTH, 200, 120), 60);
});

test('"Both" opens at an even half when the mix isn\'t mixed', () => {
  assert.equal(resolveNonVeg(PREF_BOTH, null, 100), 50);
  // 0 and "everyone" aren't mixed values — they'd contradict the label.
  assert.equal(resolveNonVeg(PREF_BOTH, 0, 100), 50);
  assert.equal(resolveNonVeg(PREF_BOTH, 100, 100), 50);
});

test("the label a split derives back to round-trips", () => {
  assert.equal(foodPreferenceForSplit(0, 100), PREF_PURE_VEG);
  assert.equal(foodPreferenceForSplit(100, 100), PREF_NON_VEG);
  assert.equal(foodPreferenceForSplit(40, 100), PREF_BOTH);
  assert.equal(foodPreferenceForSplit(null, 100), "");
  // Editing the slider writes both halves; re-deriving must not move it.
  const label = foodPreferenceForSplit(40, 100);
  assert.equal(resolveNonVeg(label, 40, 100), 40);
});

test("veg count is always the remainder, never stored separately", () => {
  assert.equal(vegCount(40, 100), 60);
  assert.equal(vegCount(0, 100), 100);
  assert.equal(clampNonVeg(-5, 100), 0);
  assert.equal(clampNonVeg(null, 100), null);
});

/* ── The strict filters ───────────────────────────────────────────────── */

test("an undeclared split filters absolutely nothing", () => {
  assert.equal(dishAllowed("non-veg", null), true);
  assert.equal(kitchenFitsSplit("Non-Veg", null), true);
});

test("a pure-veg plate never sees a non-veg dish", () => {
  assert.equal(dishAllowed("non-veg", 0), false);
  assert.equal(dishAllowed("veg", 0), true);
  // One non-veg eater is enough to unlock them.
  assert.equal(dishAllowed("non-veg", 1), true);
});

test("veg dishes stay on the menu for an all-non-veg event", () => {
  // Breads, drinks and desserts are largely veg — hiding them would make an
  // all-non-veg order impossible to assemble.
  assert.equal(dishAllowed("veg", 100), true);
  // Unmarked items (service inclusions carry no diet) always pass.
  assert.equal(dishAllowed(undefined, 0), true);
});

test("a stall survives only while it has something the plate can eat", () => {
  // The wizards drop a stall once the dish filter has emptied its list, so the
  // roster rule is just `dishAllowed` applied across the stall's dishes.
  const survives = (items: { diet: "veg" | "non-veg" }[], nv: number) =>
    items.filter((it) => dishAllowed(it.diet, nv)).length > 0;
  assert.equal(survives([veg, nonVeg], 0), true);
  assert.equal(survives([nonVeg, nonVeg], 0), false);
  assert.equal(survives([nonVeg], 50), true);
});

test("a set spread is served whole or not at all", () => {
  // One non-veg line disqualifies the whole fixed course on a pure-veg plate —
  // a set menu can't be trimmed down to its veg half.
  assert.equal(fixedSpreadFits([veg, veg, nonVeg], 0), false);
  assert.equal(fixedSpreadFits([veg, veg], 0), true);
  assert.equal(fixedSpreadFits([veg, nonVeg], 20), true);
});

test("a meat-only kitchen can't cook a pure-veg event", () => {
  assert.equal(kitchenFitsSplit("Non-Veg", 0), false);
  assert.equal(kitchenFitsSplit("Veg", 0), true);
  assert.equal(kitchenFitsSplit("Veg & Non-Veg", 0), true);
  // The reverse stays open: a veg kitchen may still run a counter at a mixed
  // event — only its dishes are gated, by dishAllowed.
  assert.equal(kitchenFitsSplit("Veg", 50), true);
});

/* ── What the guest reads back ────────────────────────────────────────── */

test("the summary names only the sides that actually have eaters", () => {
  assert.equal(splitSummary(40, 100), "60 Veg · 40 Non-veg");
  assert.equal(splitSummary(0, 100), "100 Veg");
  assert.equal(splitSummary(100, 100), "100 Non-veg");
  assert.equal(splitSummary(null, 100), "");
});
