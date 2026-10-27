/**
 * Vendor advance rule — percentage vs fixed amount, capping, validation.
 *
 * Run with `npx tsx --test src/lib/vendorAdvance.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeVendorAdvanceRule,
  normalizeVendorAdvanceRule,
  vendorAdvanceFor,
  vendorAdvanceRuleError,
} from "./vendorAdvance";

test("percent mode takes a share of the booking value", () => {
  assert.equal(vendorAdvanceFor({ mode: "percent", value: 30 }, 50_000), 15_000);
  assert.equal(vendorAdvanceFor({ mode: "percent", value: 0 }, 50_000), 0);
});

test("amount mode is flat, but never above the booking value", () => {
  assert.equal(vendorAdvanceFor({ mode: "amount", value: 5_000 }, 50_000), 5_000);
  assert.equal(vendorAdvanceFor({ mode: "amount", value: 5_000 }, 3_200), 3_200);
});

test("normalize falls back to off and clamps", () => {
  assert.deepEqual(normalizeVendorAdvanceRule(null), { mode: "percent", value: 0 });
  assert.deepEqual(normalizeVendorAdvanceRule({ mode: "percent", value: 250 }), {
    mode: "percent",
    value: 100,
  });
  assert.deepEqual(normalizeVendorAdvanceRule({ mode: "amount", value: "2500.4" }), {
    mode: "amount",
    value: 2500,
  });
});

test("validation rejects out-of-range input", () => {
  assert.equal(vendorAdvanceRuleError({ mode: "percent", value: 30 }), null);
  assert.ok(vendorAdvanceRuleError({ mode: "percent", value: 130 }));
  assert.ok(vendorAdvanceRuleError({ mode: "amount", value: -1 }));
  assert.ok(vendorAdvanceRuleError({ mode: "flat", value: 10 }));
  assert.ok(vendorAdvanceRuleError({ mode: "amount", value: "" }));
});

test("describe", () => {
  assert.equal(describeVendorAdvanceRule({ mode: "percent", value: 0 }), "Off");
  assert.equal(describeVendorAdvanceRule({ mode: "amount", value: 5000 }), "₹5,000 per booking");
});
