import assert from "node:assert/strict";
import { BAINA_BOX_VENDOR_DATA, getBainaBoxVendor } from "../src/lib/bainaBoxData.ts";

console.log("=== Testing Baina Vendor Product Association ===");

// 1. Check Ram Asrey
const ram = getBainaBoxVendor("ram-asrey");
assert.ok(ram);
assert.equal(ram.name, "Ram Asrey");
assert.equal(ram.vendorId, "vl-13");
const ramProdIds = ram.products.map(p => p.id);
assert.deepEqual(ramProdIds, ["ram-1", "ram-2", "ram-3", "ram-4"]);
const ramSig = ram.products.find(p => p.price === ram.fixedPrice) ?? ram.products[0];
assert.equal(ramSig.id, "ram-4");
assert.equal(ramSig.name, "Baina Box (Mix)");
console.log("✓ Ram Asrey products & signature verified: ram-4 (₹749)");

// 2. Check Chhappan Bhog
const ch = getBainaBoxVendor("chhappan-bhog");
assert.ok(ch);
assert.equal(ch.name, "Chhappan Bhog");
assert.equal(ch.vendorId, "vl-14");
const chProdIds = ch.products.map(p => p.id);
assert.deepEqual(chProdIds, ["ch-1", "ch-2", "ch-3", "ch-4"]);
const chSig = ch.products.find(p => p.price === ch.fixedPrice) ?? ch.products[0];
assert.equal(chSig.id, "ch-1");
assert.equal(chSig.name, "Signature Sweets Box");
console.log("✓ Chhappan Bhog products & signature verified: ch-1 (₹699)");

// 3. Check Hazelnut Factory
const hf = getBainaBoxVendor("hazelnut-factory");
assert.ok(hf);
assert.equal(hf.name, "Hazelnut Factory");
assert.equal(hf.vendorId, "vl-15");
const hfProdIds = hf.products.map(p => p.id);
assert.deepEqual(hfProdIds, ["hf-1", "hf-2", "hf-3"]);
const hfSig = hf.products.find(p => p.price === hf.fixedPrice) ?? hf.products[0];
assert.equal(hfSig.id, "hf-1");
assert.equal(hfSig.name, "Bakery Baina Hamper");
console.log("✓ Hazelnut Factory products & signature verified: hf-1 (₹599)");

// 4. Verify no overlapping product IDs across vendors
const allProds = [...ram.products, ...ch.products, ...hf.products];
const uniqueIds = new Set(allProds.map(p => p.id));
assert.equal(uniqueIds.size, allProds.length, "All Baina product IDs must be unique per vendor");
console.log("✓ Zero ID collision across vendor catalogues");

// 5. Simulate product line calculation strictly scoped to vendor
function computeLines(vendor, qtyMap) {
  return vendor.products
    .map(p => ({ ...p, qty: qtyMap[p.id] ?? 0 }))
    .filter(p => p.qty > 0);
}

// When on Ram Asrey with default 1 signature box
const ramLines = computeLines(ram, { [ramSig.id]: 1 });
assert.equal(ramLines.length, 1);
assert.equal(ramLines[0].name, "Baina Box (Mix)");
assert.equal(ramLines[0].price, 749);

// When switching to Chhappan Bhog with Chhappan's signature
const chLines = computeLines(ch, { [chSig.id]: 1 });
assert.equal(chLines.length, 1);
assert.equal(chLines[0].name, "Signature Sweets Box");
assert.equal(chLines[0].price, 699);

// Confirm Chhappan's lines cannot include Ram Asrey items
const mixedQty = { "ram-4": 1, "ch-1": 2 };
const chFiltered = computeLines(ch, mixedQty);
assert.equal(chFiltered.length, 1);
assert.equal(chFiltered[0].id, "ch-1");
assert.equal(chFiltered[0].qty, 2);
console.log("✓ Vendor product filtering completely isolates vendor catalogue");

console.log("=== All Baina Vendor Product Association Tests Passed! ===");
