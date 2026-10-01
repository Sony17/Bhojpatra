import assert from "node:assert/strict";
import { MIN_GUESTS, STALL_MIN_GUESTS, MAX_GUESTS, computeOrderTotals, deriveBookingId } from "../src/lib/bookingPricing.ts";

console.log("=== Testing Single/Live Stall Guest Minimum Reduction (FLOW-008) ===");

// 1. Check constants
assert.equal(MIN_GUESTS, 50, "Feast MIN_GUESTS should remain 50");
assert.equal(STALL_MIN_GUESTS, 20, "Single/Live Stall STALL_MIN_GUESTS should be 20");
assert.equal(MAX_GUESTS, 50_000, "MAX_GUESTS should remain 50,000");
console.log("✓ Constants verified: Feast min=50, Stall min=20, Max=50000");

// 2. Validate boundary logic
function validateStallGuests(guests) {
  return guests >= STALL_MIN_GUESTS && guests <= MAX_GUESTS;
}

assert.equal(validateStallGuests(19), false, "19 guests should be rejected");
assert.equal(validateStallGuests(20), true, "20 guests should be valid");
assert.equal(validateStallGuests(25), true, "25 guests should be valid");
assert.equal(validateStallGuests(50), true, "50 guests should be valid");
assert.equal(validateStallGuests(100), true, "100 guests should be valid");
assert.equal(validateStallGuests(50001), false, ">50,000 guests should be rejected");
console.log("✓ Guest validation boundaries verified: 19 rejected, 20-50000 accepted");

// 3. Pricing calculations for small gathering (20 guests)
const menuPerPlate = 150;
const guests = 20;
const subtotal = menuPerPlate * guests; // 3000
const totals = computeOrderTotals({
  subtotal,
  addOnsTotal: 0,
  venueFee: 0,
  serviceTotal: 0,
});

assert.equal(totals.subtotal ?? (totals.preDiscount - totals.discount), 3000);
assert.equal(totals.preDiscount, 3000);
assert.equal(totals.taxable, 3000);
assert.equal(totals.gst, 540); // 18% of 3000
assert.equal(totals.grandTotal, 3540);
const bookingId = deriveBookingId(guests, totals.grandTotal, 2);
assert.match(bookingId, /^BHJ-\d{5}$/);
console.log(`✓ 20-guest pricing ladder verified: Subtotal ₹${totals.preDiscount} + GST ₹${totals.gst} = Grand Total ₹${totals.grandTotal}`);

console.log("=== All FLOW-008 Guest Minimum Tests Passed! ===");
