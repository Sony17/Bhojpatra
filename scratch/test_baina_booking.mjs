import assert from "node:assert/strict";
import { BAINA_BOX_VENDOR_DATA, getBainaBoxVendor, getBainaBoxVendorByVendorId } from "../src/lib/bainaBoxData.ts";
import { customOrderLeadDays, DEFAULT_SINGLE_STALL_LEAD_DAYS } from "../src/lib/data.ts";
import { resolveVendorFlow, vendorBookingHref } from "../src/lib/vendorLinks.ts";

console.log("=== Testing Baina Box Booking Flow (FLOW-003) ===");

// 1. Verify Curated Baina Vendors exist and are complete
const ramAsrey = getBainaBoxVendor("ram-asrey");
assert.ok(ramAsrey, "Ram Asrey vendor data must exist");
assert.equal(ramAsrey.vendorId, "vl-13");
assert.ok(ramAsrey.products.length >= 4, "Ram Asrey should have 4 products");
console.log("✓ Curated Baina vendors loaded successfully with products");

// 2. Vendor lookup by vendorId
const chhappan = getBainaBoxVendorByVendorId("vl-14");
assert.ok(chhappan, "Lookup by vendorId vl-14 should succeed");
assert.equal(chhappan.slug, "chhappan-bhog");
console.log("✓ Vendor lookup by vendorId works");

// 3. Flow resolution and routing
assert.equal(resolveVendorFlow("ram-asrey"), "baina");
assert.equal(resolveVendorFlow("vl-13"), "baina");
assert.equal(resolveVendorFlow("chhappan-bhog"), "baina");
assert.equal(resolveVendorFlow("vl-14"), "baina");
assert.equal(resolveVendorFlow("hazelnut-factory"), "baina");
assert.equal(resolveVendorFlow("vl-15"), "baina");
console.log("✓ Baina vendors resolve strictly to 'baina' flow (never stall or live)");

// 4. Booking destination URLs
const ramHref = vendorBookingHref({ id: "vl-13" });
assert.equal(ramHref, "/baina-box/ram-asrey#baina-order");
console.log("✓ Vendor booking URL points directly to Baina order panel");

// 5. Pricing and Line calculation
const sampleQty = { "ram-1": 2, "ram-2": 3 };
const sampleLines = ramAsrey.products
  .map((p) => ({ ...p, qty: sampleQty[p.id] ?? 0 }))
  .filter((p) => p.qty > 0);

assert.equal(sampleLines.length, 2);
const totalBoxes = sampleLines.reduce((n, l) => n + l.qty, 0);
assert.equal(totalBoxes, 5);
const totalAmount = sampleLines.reduce((n, l) => n + l.qty * l.price, 0);
assert.equal(totalAmount, 2 * 799 + 3 * 599); // 1598 + 1797 = 3395
assert.equal(totalAmount, 3395);
console.log(`✓ Pricing calculation: 5 boxes total ₹${totalAmount}`);

// 6. Lead Time / Availability Rule (Next-day allowed)
const bainaLead = customOrderLeadDays(["vl-13"], DEFAULT_SINGLE_STALL_LEAD_DAYS);
assert.equal(bainaLead, 1, "Baina order lead days should be 1 (next-day delivery allowed)");
console.log("✓ Baina delivery lead time is 1 day (next-day delivery supported)");

console.log("=== All Baina Box Booking Flow Tests Passed! ===");
