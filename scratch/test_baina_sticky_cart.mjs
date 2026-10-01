import assert from "node:assert/strict";
import { resolveBainaCartSummary } from "../src/lib/bainaCart.ts";

console.log("=== Testing Persistent Sticky Baina Cart ===");

// 1. Empty cart test
const emptySummary = resolveBainaCartSummary(null);
assert.equal(emptySummary.totalBoxes, 0);
assert.equal(emptySummary.totalAmount, 0);
assert.equal(emptySummary.vendor, null);
console.log("✓ Empty cart resolves cleanly with 0 boxes");

// 2. Active Ram Asrey cart test (2 x Baina Box Mix @ 749, 1 x Kaju Katli @ 799)
const sampleCart = {
  vendorId: "vl-13",
  vendorSlug: "ram-asrey",
  vendorName: "Ram Asrey",
  qty: { "ram-4": 2, "ram-1": 1 },
};

const summary = resolveBainaCartSummary(sampleCart);
assert.ok(summary.vendor);
assert.equal(summary.vendor.name, "Ram Asrey");
assert.equal(summary.itemCount, 2);
assert.equal(summary.totalBoxes, 3);
assert.equal(summary.totalAmount, 2 * 749 + 1 * 799); // 1498 + 799 = 2297
assert.equal(summary.lines.length, 2);
console.log(`✓ Cart summary resolved for Ram Asrey: ${summary.itemCount} items · ${summary.totalBoxes} boxes = ₹${summary.totalAmount}`);

// 3. Increment product in cart
const updatedCart = {
  ...sampleCart,
  qty: { ...sampleCart.qty, "ram-1": 2 },
};
const updatedSummary = resolveBainaCartSummary(updatedCart);
assert.equal(updatedSummary.totalBoxes, 4);
assert.equal(updatedSummary.totalAmount, 2 * 749 + 2 * 799); // 1498 + 1598 = 3096
console.log(`✓ Cart summary updates on quantity change: 4 boxes = ₹${updatedSummary.totalAmount}`);

// 4. Decrement product to 0
const decrementedCart = {
  ...sampleCart,
  qty: { "ram-4": 2, "ram-1": 0 },
};
const decSummary = resolveBainaCartSummary(decrementedCart);
assert.equal(decSummary.itemCount, 1);
assert.equal(decSummary.totalBoxes, 2);
assert.equal(decSummary.totalAmount, 2 * 749);
console.log(`✓ Decrementing item to 0 removes line: 1 item · 2 boxes = ₹${decSummary.totalAmount}`);

// 5. Chhappan Bhog cart test
const chCart = {
  vendorId: "vl-14",
  vendorSlug: "chhappan-bhog",
  vendorName: "Chhappan Bhog",
  qty: { "ch-1": 3 },
};
const chSummary = resolveBainaCartSummary(chCart);
assert.equal(chSummary.vendor.name, "Chhappan Bhog");
assert.equal(chSummary.itemCount, 1);
assert.equal(chSummary.totalBoxes, 3);
assert.equal(chSummary.totalAmount, 3 * 699); // 2097
console.log(`✓ Cart summary resolved for Chhappan Bhog: 1 item · 3 boxes = ₹${chSummary.totalAmount}`);

console.log("=== All Persistent Sticky Baina Cart Tests Passed! ===");
