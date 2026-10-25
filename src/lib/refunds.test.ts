/**
 * Refund payout rules — the customer's UPI / bank destination, the admin's
 * manual-payout UTR, and the lifecycle transitions.
 *
 * Run with `npx tsx --test src/lib/refunds.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  gatewayRefunded,
  isGatewayPending,
  nextRefundId,
  parsePayoutRef,
  parseRefundPayout,
  type GatewayRefundLeg,
} from "./refunds";

test("UPI destination is normalised and validated", () => {
  assert.deepEqual(parseRefundPayout({ upiId: " name@okhdfcbank " }), {
    upiId: "name@okhdfcbank",
  });
  assert.ok("error" in (parseRefundPayout({ upiId: "not-a-vpa" }) as object));
});

test("bank destination needs name, 9–18 digit account and a real IFSC", () => {
  assert.deepEqual(
    parseRefundPayout({
      holderName: "Asha Rao",
      accountNumber: "5010 0123 456789",
      ifsc: "hdfc0001234",
    }),
    { holderName: "Asha Rao", accountNumber: "50100123456789", ifsc: "HDFC0001234" },
  );
  assert.ok("error" in (parseRefundPayout({ holderName: "Asha", accountNumber: "123", ifsc: "HDFC0001234" }) as object));
  assert.ok("error" in (parseRefundPayout({ holderName: "Asha", accountNumber: "50100123456789", ifsc: "HDFC1234" }) as object));
  assert.ok("error" in (parseRefundPayout({ accountNumber: "50100123456789", ifsc: "HDFC0001234" }) as object));
});

test("nothing given means no destination, not an error", () => {
  assert.equal(parseRefundPayout(undefined), null);
  assert.equal(parseRefundPayout({}), null);
  assert.equal(parseRefundPayout({ upiId: "  " }), null);
});

test("UTR must look like a transaction reference", () => {
  assert.equal(parsePayoutRef("412345678901"), "412345678901");
  assert.equal(parsePayoutRef(" 4123 4567 8901 "), "412345678901");
  assert.equal(parsePayoutRef("12"), "");
  assert.equal(parsePayoutRef("drop table;"), "");
  assert.equal(parsePayoutRef(undefined), "");
});

test("terminal refunds can't move", () => {
  assert.ok(canTransition("Approved", "Processed"));
  assert.ok(!canTransition("Requested", "Processed"));
  assert.ok(!canTransition("Processed", "Declined"));
});

test("refund ids never reuse a number, even after a delete", () => {
  const now = new Date("2026-10-26T10:00:00Z");
  assert.equal(nextRefundId([], now), "RFD-20260001");
  // Two rows left after RFD-20260002 was deleted: count would give 0003 = clash.
  assert.equal(
    nextRefundId([{ id: "RFD-20260001" }, { id: "RFD-20260003" }], now),
    "RFD-20260004",
  );
  assert.equal(nextRefundId([{ id: "RFD-20250009" }], now), "RFD-20260001");
});

test("gateway legs: failed ones don't count, pending keeps it Initiated", () => {
  const legs: GatewayRefundLeg[] = [
    { id: "rfnd_a", paymentId: "pay_a", amount: 500, status: "processed" },
    { id: "rfnd_b", paymentId: "pay_b", amount: 300, status: "pending" },
    { id: "rfnd_c", paymentId: "pay_c", amount: 200, status: "failed" },
  ];
  assert.equal(gatewayRefunded({ gatewayRefunds: legs }), 800);
  assert.equal(isGatewayPending({ status: "Processed", gatewayRefunds: legs }), true);
  assert.equal(isGatewayPending({ status: "Approved", gatewayRefunds: legs }), false);
  assert.equal(
    isGatewayPending({ status: "Processed", gatewayRefunds: [legs[0]] }),
    false,
  );
  assert.equal(isGatewayPending({ status: "Processed" }), false);
});
