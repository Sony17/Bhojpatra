import assert from "node:assert/strict";
import { recordRazorpayPayment } from "../src/lib/razorpayPayments.ts";
import { createStore } from "../src/lib/store.ts";
import { PATCH as patchBookingRoute } from "../src/app/api/bookings/[id]/route.ts";
import { POST as createRazorpayOrderRoute } from "../src/app/api/payments/razorpay/order/route.ts";

console.log("=== Testing Secure Pay Balance & Remaining Payment Flow (FLOW-001 + FLOW-002) ===");

const bookingStore = createStore({ table: "bookings", idField: "id" });
const paymentStore = createStore({ table: "payments", idField: "id" });

async function runTests() {
  const testBookingId = "BHJ-BTEST01";
  const testBookingId2 = "BHJ-BTEST02";

  const paymentIds = [
    "PMT-Rbal_test_1",
    "PMT-Rbal_test_2",
    "PMT-Rinit_test_999",
  ];

  // Cleanup any leftover test data at the start using store.remove()
  try {
    await bookingStore.remove(testBookingId);
    await bookingStore.remove(testBookingId2);
    for (const pid of paymentIds) {
      await paymentStore.remove(pid);
    }
  } catch (err) {
    console.warn("Cleanup warning:", err);
  }

  // Test 1: Pending booking with balance -> Pay Balance -> verified payment
  // Initial: Total ₹50,000, Paid ₹5,000 (Advance), Status "Pending"
  const pendingBooking = {
    id: testBookingId,
    userId: "user-123",
    customer: "Rohan Verma",
    phone: "9876543210",
    email: "rohan@example.com",
    occasion: "Engagement",
    date: "15 Oct 2026",
    guests: 100,
    vendor: "Royal Caterers",
    city: "Lucknow",
    amount: 50000,
    paid: 5000,
    paymentMethod: "Razorpay",
    paymentRef: "pay_adv_111",
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  await bookingStore.upsert(pendingBooking);

  // Server-side balance calculation
  const b1 = await bookingStore.get(testBookingId);
  assert.ok(b1);
  const remaining1 = Math.max(0, b1.amount - b1.paid);
  assert.equal(remaining1, 45000, "Remaining balance on Pending booking should be ₹45,000");

  // Verified payment arrives for ₹45,000
  const payment1 = await recordRazorpayPayment({
    bookingId: testBookingId,
    amountRupees: remaining1,
    orderId: "order_bal_test_1",
    paymentId: "pay_bal_test_1",
    customer: "Rohan Verma",
  });
  assert.equal(payment1.amount, 45000);
  assert.equal(payment1.txnRef, "order_bal_test_1");

  // Verify booking updated in database
  const b1Updated = await bookingStore.get(testBookingId);
  assert.ok(b1Updated);
  assert.equal(b1Updated.paid, 50000, "Paid amount should now be ₹50,000");
  assert.equal(b1Updated.status, "Confirmed", "Status should transition to Confirmed upon full balance payment");
  assert.equal(b1Updated.paymentRef, "pay_bal_test_1");
  console.log("✓ Test 1 Passed: Pending booking with balance securely updated to Confirmed upon full verified payment");

  // Test 2: Confirmed booking with balance (e.g. Baina Connect/COD with paid: 0 or Partial)
  // Initial: Total ₹20,000, Paid ₹2,000, Status "Confirmed"
  const confirmedBooking = {
    id: testBookingId2,
    userId: "user-123",
    customer: "Sneha Gupta",
    phone: "9876543211",
    email: "sneha@example.com",
    occasion: "Baina Box",
    date: "20 Oct 2026",
    guests: 10,
    vendor: "Ram Asrey",
    city: "Lucknow",
    amount: 20000,
    paid: 2000,
    paymentMethod: "Razorpay",
    paymentRef: "pay_adv_222",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  };
  await bookingStore.upsert(confirmedBooking);

  const b2 = await bookingStore.get(testBookingId2);
  assert.ok(b2);
  const remaining2 = Math.max(0, b2.amount - b2.paid);
  assert.equal(remaining2, 18000, "Remaining balance on Confirmed booking should be ₹18,000");

  const payment2 = await recordRazorpayPayment({
    bookingId: testBookingId2,
    amountRupees: remaining2,
    orderId: "order_bal_test_2",
    paymentId: "pay_bal_test_2",
    customer: "Sneha Gupta",
  });
  assert.equal(payment2.amount, 18000);

  const b2Updated = await bookingStore.get(testBookingId2);
  assert.ok(b2Updated);
  assert.equal(b2Updated.paid, 20000, "Paid amount should now be ₹20,000");
  assert.equal(b2Updated.status, "Confirmed", "Status should remain Confirmed");
  assert.equal(b2Updated.paymentRef, "pay_bal_test_2");
  console.log("✓ Test 2 Passed: Confirmed booking with balance securely updated to full paid and remains Confirmed");

  // Test 3: Fully paid booking -> remaining balance is 0
  const remainingAfter = Math.max(0, b2Updated.amount - b2Updated.paid);
  assert.equal(remainingAfter, 0, "Fully paid booking has 0 remaining balance");
  console.log("✓ Test 3 Passed: Fully paid booking has 0 remaining balance");

  // Test 4: Idempotency — attempting to record the same payment again does not duplicate or re-increment
  const duplicatePayment = await recordRazorpayPayment({
    bookingId: testBookingId2,
    amountRupees: remaining2,
    orderId: "order_bal_test_2",
    paymentId: "pay_bal_test_2",
    customer: "Sneha Gupta",
  });
  assert.equal(duplicatePayment.id, payment2.id);
  const b2Recheck = await bookingStore.get(testBookingId2);
  assert.equal(b2Recheck.paid, 20000, "Paid amount must not exceed total amount upon duplicate call");
  console.log("✓ Test 4 Passed: Payment idempotency prevents double-crediting or duplicate ledger rows");

  // Test 5: Initial checkout compatibility (booking not yet in DB at verify time)
  const initialOrderId = "order_init_test_999";
  const initialPayment = await recordRazorpayPayment({
    bookingId: "BHJ-BNEW999",
    amountRupees: 5000,
    orderId: initialOrderId,
    paymentId: "pay_init_test_999",
    customer: "New Customer",
  });
  assert.equal(initialPayment.amount, 5000);
  assert.equal(initialPayment.status, "Advance Received");
  console.log("✓ Test 5 Passed: Initial checkout compatibility preserved for uncreated bookings");

  // Clean up test records
  try {
    await bookingStore.remove(testBookingId);
    await bookingStore.remove(testBookingId2);
    for (const pid of paymentIds) {
      await paymentStore.remove(pid);
    }
  } catch {}

  console.log("=== All FLOW-001 & FLOW-002 Pay Balance Tests Passed Successfully! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
