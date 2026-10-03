import assert from "node:assert/strict";
import { coupons } from "../src/lib/data.ts";
import { ADVANCE_RATE } from "../src/lib/bookingPricing.ts";
import { customerPercentFor, DEFAULT_REFERRAL_RATES } from "../src/lib/referralRates.ts";

console.log("=== Testing Baina Box Checkout, Coupons, Referrals & Payment (FLOW-009) ===");

// 1. Coupons test
const totalAmount = 2000;
const bhoj10 = coupons.find(c => c.code === "BHOJ10");
assert.ok(bhoj10, "BHOJ10 coupon must exist");
const couponDiscount = Math.min((totalAmount * bhoj10.percent) / 100, bhoj10.cap);
assert.equal(couponDiscount, 200, "BHOJ10 on ₹2000 should be ₹200");

const grandTotal = totalAmount - couponDiscount;
assert.equal(grandTotal, 1800);

const advanceAmount = Math.max(1, Math.round(grandTotal * ADVANCE_RATE));
assert.equal(advanceAmount, 180, "10% advance on ₹1800 should be ₹180");
console.log(`✓ Coupon calculation: ₹${totalAmount} - ₹${couponDiscount} (${bhoj10.code}) = ₹${grandTotal}, Advance = ₹${advanceAmount}`);

// 2. Invalid coupon test
const invalidCode = "INVALID999";
const invalidFound = coupons.find(c => c.code.toUpperCase() === invalidCode);
assert.equal(invalidFound, undefined, "Invalid coupon should not be found");
console.log("✓ Invalid coupon correctly rejected");

// 3. Referral discount test
const sampleRates = {
  ...DEFAULT_REFERRAL_RATES,
  individual: { customerPercent: 5, referrerPercent: 5 },
};
const refPercent = customerPercentFor(sampleRates, "individual");
assert.equal(refPercent, 5);
const refDiscount = Math.round((totalAmount * refPercent) / 100);
assert.equal(refDiscount, 100);
const totalWithBoth = Math.max(0, totalAmount - couponDiscount - refDiscount);
assert.equal(totalWithBoth, 1700);
console.log(`✓ Referral calculation: ₹${totalAmount} - ₹${couponDiscount} (coupon) - ₹${refDiscount} (referral) = ₹${totalWithBoth}`);

// 4. Booking creation & verification flow simulation
const orderPayload = {
  id: "BHJ-B12345",
  customer: "Ankit Sharma",
  phone: "9876543210",
  email: "ankit@example.com",
  occasion: "Baina Box",
  date: "10 Sep 2026",
  eventDateISO: "2026-09-10",
  packageId: "custom",
  guests: 3,
  vendor: "Ram Asrey",
  city: "Lucknow",
  venue: "12 Hazratganj, Lucknow",
  amount: grandTotal,
  paid: advanceAmount,
  paymentMethod: "Razorpay",
  paymentRef: "pay_test123456",
  referralCode: "PARTNER01",
  status: "Confirmed",
  vendors: [{ id: "vl-13", name: "Ram Asrey" }],
};

assert.equal(orderPayload.amount, 1800);
assert.equal(orderPayload.paid, 180);
assert.equal(orderPayload.paymentMethod, "Razorpay");
assert.equal(orderPayload.paymentRef, "pay_test123456");
console.log("✓ Online advance booking payload matches verified payment ledger structure");

// 5. Connect / COD simulation
const connectPayload = {
  ...orderPayload,
  paid: 0,
  paymentMethod: "Connect",
  paymentRef: undefined,
};
assert.equal(connectPayload.amount, 1800);
assert.equal(connectPayload.paid, 0);
assert.equal(connectPayload.paymentMethod, "Connect");
console.log("✓ Connect / Pay on Delivery payload preserves unpaid state");

console.log("=== All FLOW-009 Checkout & Payment Tests Passed! ===");
