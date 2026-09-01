import assert from "node:assert/strict";
import { vendorListings, cities } from "../src/lib/data.ts";
import { resolveVendorFlow, vendorBookingHref } from "../src/lib/vendorLinks.ts";

console.log("=== Testing Booking Flow Routing & Compare View Fixes ===");

// 1. Single Stall Vendor (vl-1: Awadhi Royal Caterers)
const singleStall = vendorListings.find((v) => v.id === "vl-1");
assert.ok(singleStall, "Single stall vendor vl-1 exists");
const singleFlow = resolveVendorFlow(singleStall.id);
assert.equal(singleFlow, "stall", "vl-1 should resolve to stall flow");
const singleHref = vendorBookingHref(singleStall, "lucknow");
assert.equal(
  singleHref,
  "/book/stall?vendor=vl-1&city=lucknow",
  "Single stall vendor should route to /book/stall with vendor ID and city"
);
console.log("✓ Single Stall vendor routes to /book/stall with vendor ID preserved");

// 2. Live Stall Vendor (vl-16: Chowk Chaat Bhandar - Chaat & Live Counters)
const liveStall = vendorListings.find((v) => v.id === "vl-16");
assert.ok(liveStall, "Live stall vendor vl-16 exists");
const liveFlow = resolveVendorFlow(liveStall.id);
assert.equal(liveFlow, "live", "vl-16 should resolve to live stall flow");
const liveHref = vendorBookingHref(liveStall, "lucknow");
assert.equal(
  liveHref,
  "/book/live-stall?vendor=vl-16&city=lucknow",
  "Live stall vendor should route to /book/live-stall with vendor ID and city"
);
console.log("✓ Live Stall vendor routes to /book/live-stall with vendor ID preserved");

// 3. Another Live Stall Vendor (vl-19: Sharbat-e-Awadh - Beverages & Live Counters)
const liveBeverage = vendorListings.find((v) => v.id === "vl-19");
assert.ok(liveBeverage, "Live beverage vendor vl-19 exists");
const liveBevFlow = resolveVendorFlow(liveBeverage.id);
assert.equal(liveBevFlow, "live", "vl-19 should resolve to live stall flow");
const liveBevHref = vendorBookingHref(liveBeverage, "lucknow");
assert.equal(
  liveBevHref,
  "/book/live-stall?vendor=vl-19&city=lucknow",
  "Live beverage vendor should route to /book/live-stall"
);
console.log("✓ Live Beverage vendor routes to /book/live-stall");

// 4. Baina Box Vendor (vl-13: Ram Asrey)
const bainaVendor = vendorListings.find((v) => v.id === "vl-13");
assert.ok(bainaVendor, "Baina vendor vl-13 exists");
const bainaFlow = resolveVendorFlow(bainaVendor.id);
assert.equal(bainaFlow, "baina", "vl-13 should resolve to baina flow");
const bainaHref = vendorBookingHref(bainaVendor, "lucknow");
assert.equal(
  bainaHref,
  "/baina-box/ram-asrey#baina-order",
  "Baina vendor should route to /baina-box/<slug>#baina-order"
);
console.log("✓ Baina vendor routes to /baina-box/<slug>#baina-order");

// 5. Direct slug lookup for Baina
assert.equal(resolveVendorFlow("ram-asrey"), "baina");
assert.equal(resolveVendorFlow("chhappan-bhog"), "baina");
console.log("✓ Baina slug direct lookups resolve to baina flow");

// 6. Course-level vendor ID check (e.g. ch-lucknow, pz-forno, pa-alfredo, cn-wok)
assert.equal(resolveVendorFlow("ch-lucknow"), "live");
assert.equal(resolveVendorFlow("pz-forno"), "live");
assert.equal(resolveVendorFlow("pa-alfredo"), "live");
assert.equal(resolveVendorFlow("cn-wok"), "live");
console.log("✓ Course-level live counter IDs (chaat, pizza, pasta, chinese) resolve to live flow");

console.log("=== All Routing & Flow Resolution Tests Passed! ===");
