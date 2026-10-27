/**
 * RazorpayX payout status mapping — what counts as Paid / Failed / in flight.
 *
 * Run with `npx tsx --test src/lib/vendorPayouts.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { payoutStatusOf } from "./vendorPayouts";
import { isLivePayout } from "./settlements";

test("only processed is Paid; terminal failures free the row for a retry", () => {
  assert.equal(payoutStatusOf("processed"), "Paid");
  for (const s of ["reversed", "cancelled", "rejected", "failed"]) {
    assert.equal(payoutStatusOf(s), "Failed");
  }
  for (const s of ["queued", "pending", "processing", "scheduled"]) {
    assert.equal(payoutStatusOf(s), "Processing");
  }
});

test("a failed send no longer counts as money out", () => {
  const base = { payoutId: "pout_1", rawStatus: "", mode: "IMPS", attempt: 1, updatedAt: "" };
  assert.ok(isLivePayout({}));
  assert.ok(isLivePayout({ razorpayX: { ...base, status: "Processing" } }));
  assert.ok(!isLivePayout({ razorpayX: { ...base, status: "Failed" } }));
});
