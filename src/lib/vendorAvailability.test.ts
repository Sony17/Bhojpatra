/**
 * Single Stall availability — the vendor's days off plus the slots their
 * orders hold, as the customer calendar, the vendor portal and the booking
 * POST all read them.
 *
 * Run with `npx tsx --test src/lib/vendorAvailability.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarOrder } from "@/lib/bookingRules";
import {
  availabilityFor,
  bookedDays,
  cleanBlockedDates,
  isIsoDate,
  partlyBookedDates,
  takenMeals,
  unavailableDates,
} from "@/lib/vendorAvailability";

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

test("only real calendar days count as dates", () => {
  assert.equal(isIsoDate("2026-12-12"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("12 Dec 2026"), false);
  assert.equal(isIsoDate(20261212), false);
});

test("days off are cleaned: valid, from today, unique, sorted", () => {
  assert.deepEqual(
    cleanBlockedDates(["2026-12-12", "2026-10-01", "2026-12-12", "bad", "2026-11-02"], "2026-10-06"),
    ["2026-11-02", "2026-12-12"],
  );
  assert.deepEqual(cleanBlockedDates("2026-12-12", "2026-10-06"), []);
});

test("booked days group the vendor's slot-holding orders by date", () => {
  const days = bookedDays(
    [
      order({}),
      order({ id: "B", mealTime: "Lunch" }),
      order({ id: "C", eventDateISO: "2026-12-13", vendors: [{ id: "V2" }] }),
      order({ id: "D", eventDateISO: "2026-12-14", status: "Cancelled" }),
      order({ id: "E", eventDateISO: "2026-09-01" }),
    ],
    "V1",
    { now },
  );
  assert.deepEqual(days, [{ date: "2026-12-12", meals: ["Dinner", "Lunch"], full: false }]);
});

test("an order with no meal time, or the per-day cap, fills the day", () => {
  assert.equal(bookedDays([order({ mealTime: undefined })], "V1", { now })[0].full, true);
  assert.equal(bookedDays([order({})], "V1", { now, maxEventsPerDay: 1 })[0].full, true);
  assert.equal(bookedDays([order({})], "V1", { now, maxEventsPerDay: 2 })[0].full, false);
});

test("availability mirrors the checkout rule", () => {
  const av = {
    blocked: ["2026-12-20"],
    booked: [
      { date: "2026-12-12", meals: ["Dinner"], full: false },
      { date: "2026-12-13", meals: [], full: true },
    ],
  };
  assert.equal(availabilityFor(av, "2026-12-20", "Lunch"), "blocked");
  assert.equal(availabilityFor(av, "2026-12-13", "Lunch"), "day");
  assert.equal(availabilityFor(av, "2026-12-12", "dinner"), "slot");
  assert.equal(availabilityFor(av, "2026-12-12", "Lunch"), null);
  // No meal chosen clashes with any order that day, as slotConflict does.
  assert.equal(availabilityFor(av, "2026-12-12"), "slot");
  assert.equal(availabilityFor(av, "2026-12-15"), null);
  assert.equal(availabilityFor(null, "2026-12-12"), null);

  assert.deepEqual(unavailableDates(av), ["2026-12-13", "2026-12-20"]);
  assert.deepEqual(partlyBookedDates(av), ["2026-12-12"]);
  assert.deepEqual(takenMeals(av, "2026-12-12"), ["Dinner"]);
});
