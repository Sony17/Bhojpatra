/**
 * Service-package ("Essentials") pricing by head-count — the admin's guest
 * bands, the nearest-band fallback, and the save-path cleanup.
 *
 * Run with `npx tsx --test src/lib/servicePricing.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGuestTiers,
  serviceRate,
  serviceTotal,
} from "./servicePricing";

const banded = {
  priceMin: 0,
  perPlate: true,
  guestTiers: [
    { minGuests: 50, maxGuests: 100, price: 60 },
    { minGuests: 101, maxGuests: 300, price: 50 },
    { minGuests: 500, maxGuests: 1000, price: 40 },
  ],
};

test("a covering band prices per guest", () => {
  assert.equal(serviceRate(banded, 50), 60);
  assert.equal(serviceRate(banded, 100), 60);
  assert.equal(serviceRate(banded, 101), 50);
  assert.equal(serviceTotal(banded, 120), 50 * 120);
});

test("outside every band takes the nearest band, never priceMin", () => {
  assert.equal(serviceRate(banded, 20), 60, "below the first band");
  assert.equal(serviceRate(banded, 400), 50, "in the 301–499 gap");
  assert.equal(serviceRate(banded, 2000), 40, "above a closed last band");
});

test("no table falls back to priceMin", () => {
  const flat = { priceMin: 150, perPlate: true };
  assert.equal(serviceTotal(flat, 120), 150 * 120);
  assert.equal(serviceTotal({ priceMin: 0, perPlate: true }, 120), 0);
});

test("a flat package charges the band price once", () => {
  const fee = { ...banded, perPlate: false };
  assert.equal(serviceTotal(fee, 120), 50);
});

test("normalizeGuestTiers sorts, clamps and drops overlaps", () => {
  assert.deepEqual(
    normalizeGuestTiers([
      { minGuests: "200", maxGuests: "", price: "30" },
      { minGuests: 0, maxGuests: 199, price: 40 },
      { minGuests: 150, maxGuests: 250, price: 35 },
      { minGuests: 300, maxGuests: 100, price: "x" },
    ]),
    [
      { minGuests: 0, maxGuests: 199, price: 40 },
      { minGuests: 200, maxGuests: null, price: 30 },
    ],
  );
});
