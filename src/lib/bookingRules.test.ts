/**
 * Server-authoritative booking rules — IST calendar maths, money → status,
 * coupon eligibility, vendor minimums and the double-booking rule.
 *
 * Run with `npx tsx --test src/lib/bookingRules.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceDue,
  amountDueNow,
  bookingStatusFor,
  couponUsable,
  daysUntilIST,
  holdsSlot,
  hoursUntilEventIST,
  isPastEventIST,
  istTodayISO,
  parseEventDate,
  slotConflict,
  vendorMinGuests,
  type CalendarOrder,
} from "@/lib/bookingRules";

// 2026-10-06 20:00 UTC = 2026-10-07 01:30 IST — the UTC and IST dates differ.
const lateNightUtc = new Date("2026-10-06T20:00:00Z");

/* ── IST calendar ─────────────────────────────────────────────────────── */

test("today is the IST date, not the server's UTC date", () => {
  assert.equal(istTodayISO(lateNightUtc), "2026-10-07");
  assert.equal(istTodayISO(new Date("2026-10-06T10:00:00Z")), "2026-10-06");
});

test("event dates parse from ISO or the display label", () => {
  assert.equal(parseEventDate("2026-12-12"), "2026-12-12");
  assert.equal(parseEventDate("12 Dec 2026"), "2026-12-12");
  assert.equal(parseEventDate("2 Feb 2027"), "2027-02-02");
  assert.equal(parseEventDate("—"), null);
  assert.equal(parseEventDate("2026-02-30"), null);
});

test("lead days count IST calendar days", () => {
  assert.equal(daysUntilIST("2026-10-07", lateNightUtc), 0);
  assert.equal(daysUntilIST("2026-10-09", lateNightUtc), 2);
  assert.equal(daysUntilIST("bad", lateNightUtc), null);
});

test("hours until the event use the serving time in IST", () => {
  const now = new Date("2026-10-06T04:30:00Z"); // 10:00 IST
  assert.equal(hoursUntilEventIST("2026-10-07", { eventTime: "10:00" }, now), 24);
  assert.equal(hoursUntilEventIST("2026-10-07", { mealTime: "Dinner" }, now), 33);
  // No time at all → start of the day (strictest).
  assert.equal(hoursUntilEventIST("2026-10-07", {}, now), 14);
});

test("an event is past only once its IST date is before today", () => {
  assert.equal(isPastEventIST({ eventDateISO: "2026-10-06" }, lateNightUtc), true);
  assert.equal(isPastEventIST({ eventDateISO: "2026-10-07" }, lateNightUtc), false);
  assert.equal(isPastEventIST({ date: "05 Oct 2026" }, lateNightUtc), true);
  assert.equal(isPastEventIST({ date: "—" }, lateNightUtc), false);
});

/* ── Money → status ───────────────────────────────────────────────────── */

test("confirmed only once the 10% advance is in", () => {
  assert.equal(advanceDue(100_000), 10_000);
  assert.equal(bookingStatusFor(100_000, 0), "Pending");
  assert.equal(bookingStatusFor(100_000, 9_999), "Pending");
  assert.equal(bookingStatusFor(100_000, 10_000), "Confirmed");
  assert.equal(bookingStatusFor(0, 0), "Pending");
});

test("what's due next: the rest of the advance, then the balance", () => {
  assert.equal(amountDueNow(100_000, 0), 10_000);
  assert.equal(amountDueNow(100_000, 4_000), 6_000);
  assert.equal(amountDueNow(100_000, 10_000), 90_000);
  assert.equal(amountDueNow(100_000, 100_000), 0);
});

/* ── Coupons ──────────────────────────────────────────────────────────── */

const base = { code: "X", percent: 10, cap: 5000, status: "Active" };
const ctx = { todayISO: "2026-10-06", occasion: "Birthday", isFirstBooking: false };

test("inactive, early or expired coupons are refused", () => {
  assert.equal(couponUsable({ ...base, status: "Inactive" }, ctx).ok, false);
  assert.equal(couponUsable({ ...base, startsAt: "01 Nov 2026" }, ctx).ok, false);
  assert.equal(couponUsable({ ...base, expiresAt: "31 Aug 2026" }, ctx).ok, false);
  assert.equal(
    couponUsable({ ...base, startsAt: "01 Jun 2026", expiresAt: "31 Dec 2026" }, ctx).ok,
    true,
  );
  // An unparseable bound doesn't void the coupon.
  assert.equal(couponUsable({ ...base, expiresAt: "soon" }, ctx).ok, true);
});

test("eligibility: first booking and occasion-only coupons", () => {
  assert.equal(couponUsable({ ...base, eligibility: "All occasions" }, ctx).ok, true);
  assert.equal(couponUsable({ ...base, eligibility: "First booking only" }, ctx).ok, false);
  assert.equal(
    couponUsable({ ...base, eligibility: "First booking only" }, { ...ctx, isFirstBooking: true }).ok,
    true,
  );
  assert.equal(couponUsable({ ...base, eligibility: "Weddings only" }, ctx).ok, false);
  assert.equal(
    couponUsable({ ...base, eligibility: "Weddings only" }, { ...ctx, occasion: "Wedding Reception" }).ok,
    true,
  );
});

/* ── Vendor terms & calendar ──────────────────────────────────────────── */

test("vendor minimum guests: general minimum raised by a course guarantee", () => {
  assert.equal(vendorMinGuests(null, ["chaat"]), 0);
  assert.equal(vendorMinGuests({ minPax: 80 }, []), 80);
  const v = {
    minPax: 80,
    stallConfig: { categoryPricing: { chaat: { minPaxGuarantee: 150 }, pizza: { minPaxGuarantee: 60 } } },
  };
  assert.equal(vendorMinGuests(v, ["pizza"]), 80);
  assert.equal(vendorMinGuests(v, ["pizza", "chaat"]), 150);
});

const now = new Date("2026-10-06T12:00:00Z");
const order = (o: Partial<CalendarOrder>): CalendarOrder => ({
  id: "BHJ-A",
  status: "Confirmed",
  eventDateISO: "2026-12-12",
  mealTime: "Dinner",
  paid: 1000,
  vendors: [{ id: "V1" }],
  createdAt: "2026-10-01T00:00:00Z",
  ...o,
});
const req = { id: "BHJ-B", vendorId: "V1", eventDateISO: "2026-12-12", mealTime: "Dinner" };

test("the same vendor, date and meal slot is taken", () => {
  assert.equal(slotConflict([order({})], req, now), "slot");
  assert.equal(slotConflict([order({ mealTime: "Lunch" })], req, now), null);
  assert.equal(slotConflict([order({ eventDateISO: "2026-12-13" })], req, now), null);
  assert.equal(slotConflict([order({ vendors: [{ id: "V2" }] })], req, now), null);
  // Re-posting the same order never collides with itself.
  assert.equal(slotConflict([order({ id: "BHJ-B" })], req, now), null);
  // A missing meal time takes the whole day.
  assert.equal(slotConflict([order({ mealTime: undefined })], req, now), "slot");
});

test("cancelled, declined and stale unpaid orders free the slot", () => {
  assert.equal(slotConflict([order({ status: "Cancelled" })], req, now), null);
  assert.equal(slotConflict([order({ vendorDeclined: true })], req, now), null);
  const unpaid = { status: "Pending", paid: 0 };
  // A Connect order holds for 48h, an open checkout for 30 minutes.
  assert.equal(holdsSlot(order({ ...unpaid, createdAt: "2026-10-05T00:00:00Z" }), now), true);
  assert.equal(holdsSlot(order({ ...unpaid, createdAt: "2026-10-01T00:00:00Z" }), now), false);
  assert.equal(
    holdsSlot(order({ ...unpaid, awaitingPayment: true, createdAt: "2026-10-06T11:45:00Z" }), now),
    true,
  );
  assert.equal(
    holdsSlot(order({ ...unpaid, awaitingPayment: true, createdAt: "2026-10-06T11:00:00Z" }), now),
    false,
  );
  // Accepted by the vendor → held regardless of payment.
  assert.equal(
    holdsSlot(order({ ...unpaid, vendorAcknowledged: true, createdAt: "2026-10-01T00:00:00Z" }), now),
    true,
  );
});

test("the vendor's per-day cap applies across meal slots", () => {
  const lunch = order({ id: "BHJ-L", mealTime: "Lunch" });
  assert.equal(slotConflict([lunch], { ...req, maxEventsPerDay: 2 }, now), null);
  assert.equal(slotConflict([lunch], { ...req, maxEventsPerDay: 1 }, now), "day");
});
