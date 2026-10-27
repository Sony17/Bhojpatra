/**
 * Single Stall booking notice — the vendor's own lead (same day / next day /
 * N days) and the same-day cut-off, as the wizard and the booking POST apply it.
 *
 * Run with `npx tsx --test src/lib/stallNotice.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanStallNotice,
  formatCutoff,
  istNowHHMM,
  stallNoticeProblem,
} from "@/lib/stallNotice";

// 05:30 UTC = 11:00 IST; 08:30 UTC = 14:00 IST.
const morning = new Date("2026-10-26T05:30:00Z");
const afternoon = new Date("2026-10-26T08:30:00Z");

test("only the offered notices are stored; same day carries a cut-off", () => {
  assert.deepEqual(cleanStallNotice(0, "15:00"), { stallNoticeDays: 0, sameDayCutoff: "15:00" });
  assert.deepEqual(cleanStallNotice(0, "bad"), { stallNoticeDays: 0, sameDayCutoff: "12:00" });
  assert.deepEqual(cleanStallNotice("1", "15:00"), { stallNoticeDays: 1 });
  assert.equal(cleanStallNotice(5, null), null);
  assert.equal(cleanStallNotice(undefined, null), null);
});

test("IST clock and cut-off labels", () => {
  assert.equal(istNowHHMM(morning), "11:00");
  assert.equal(formatCutoff("13:00"), "1:00 PM");
  assert.equal(formatCutoff("09:00"), "9:00 AM");
  assert.equal(formatCutoff("12:00"), "12:00 PM");
});

test("no notice set → nothing to enforce here (platform default applies)", () => {
  assert.equal(stallNoticeProblem({}, 0, morning), null);
});

test("same day is open until the cut-off, then closed", () => {
  const rule = { noticeDays: 0, cutoff: "12:00" };
  assert.equal(stallNoticeProblem(rule, 0, morning), null);
  assert.deepEqual(stallNoticeProblem(rule, 0, afternoon), { kind: "cutoff", cutoff: "12:00" });
  assert.equal(stallNoticeProblem(rule, 1, afternoon), null);
  assert.deepEqual(stallNoticeProblem(rule, -1, morning), { kind: "days", days: 0 });
});

test("next day and longer notices count whole IST days", () => {
  assert.deepEqual(stallNoticeProblem({ noticeDays: 1 }, 0, morning), { kind: "days", days: 1 });
  assert.equal(stallNoticeProblem({ noticeDays: 1 }, 1, morning), null);
  assert.deepEqual(stallNoticeProblem({ noticeDays: 3 }, 2, morning), { kind: "days", days: 3 });
  assert.equal(stallNoticeProblem({ noticeDays: 3 }, 3, morning), null);
});
