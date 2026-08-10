/**
 * Venue space maths — how the categories an owner declares turn into the
 * individually bookable cards a customer taps, and what a selection costs.
 *
 * Run with `npx tsx --test src/lib/venues.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  venueSpaceOptions,
  venueQuote,
  venueSpaceKinds,
  venueDescription,
} from "@/lib/venues";

const base = {
  id: "probe",
  name: "Probe",
  city: "lucknow",
  location: "QA",
  type: "Open Lawn",
  capacity: "100 Guests",
  priceFrom: "₹50,000",
  rating: 4.5,
  reviews: 0,
  image: "/x.png",
};

test("owner-set units expand into numbered, separately bookable spaces", () => {
  const opts = venueSpaceOptions({
    ...base,
    price: 50000,
    spaces: [
      { key: "banquet", price: 50000, units: 1 },
      { key: "lawn", price: 70000, units: 3 },
      { key: "rooms", price: 4000, units: 40 },
    ],
  });
  assert.deepEqual(
    opts.map((o) => o.id),
    ["banquet", "lawn-1", "lawn-2", "lawn-3", "rooms"],
  );
  assert.deepEqual(
    opts.map((o) => o.en),
    ["Banquet Hall", "Open Lawn 1", "Open Lawn 2", "Open Lawn 3", "Guest Rooms"],
  );
  // Rooms stay a single card; their count is the counter's ceiling instead.
  assert.equal(opts.at(-1)!.units, 40);
  assert.equal(opts.at(-1)!.subject, true);
});

test("quote sums every picked space plus the rooms asked for", () => {
  const opts = venueSpaceOptions({
    ...base,
    price: 50000,
    spaces: [
      { key: "banquet", price: 50000, units: 1 },
      { key: "lawn", price: 70000, units: 2 },
      { key: "rooms", price: 4000, units: 10 },
    ],
  });
  assert.equal(venueQuote(opts, ["banquet"], 0), 50000);
  assert.equal(venueQuote(opts, ["banquet", "lawn-2"], 0), 120000);
  assert.equal(venueQuote(opts, ["banquet", "lawn-1", "lawn-2"], 3), 202000);
  // Nothing picked = nothing owed.
  assert.equal(venueQuote(opts, [], 0), 0);
  // More rooms than the venue has is clamped, never billed.
  assert.equal(venueQuote(opts, [], 999), 40000);
  // An id that isn't on offer is ignored rather than throwing.
  assert.equal(venueQuote(opts, ["lawn-9"], 0), 0);
});

test("a lawn-type seed venue derives two lawns; a hall derives one", () => {
  assert.deepEqual(
    venueSpaceOptions({ ...base, price: 50000 }).map((o) => o.id),
    ["banquet", "lawn-1", "lawn-2", "rooms"],
  );
  assert.deepEqual(
    venueSpaceOptions({ ...base, type: "Banquet Hall", price: 50000 }).map(
      (o) => o.id,
    ),
    ["banquet", "lawn", "rooms"],
  );
});

test("prose collapses numbered instances back to one per kind", () => {
  const venue = {
    ...base,
    price: 50000,
    spaces: [
      { key: "lawn" as const, price: 70000, units: 3 },
      { key: "rooms" as const, price: 4000, units: 10 },
    ],
  };
  assert.deepEqual(
    venueSpaceKinds(venue).map((s) => s.en),
    ["Open Lawn", "Guest Rooms"],
  );
  const copy = venueDescription(venue, "en");
  assert.match(copy, /an open lawn and guest rooms on request/);
  assert.doesNotMatch(copy, /open lawn 2/i);
});

test("legacy records saved before unit counts keep working", () => {
  const opts = venueSpaceOptions({
    ...base,
    price: 50000,
    spaces: [
      { key: "banquet", price: 50000 },
      { key: "rooms", price: 4000 },
    ],
  });
  assert.deepEqual(
    opts.map((o) => o.id),
    ["banquet", "rooms"],
  );
  // No declared inventory falls back to the assumed ten rooms.
  assert.equal(opts.at(-1)!.units, 10);
});
