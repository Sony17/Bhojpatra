import assert from "node:assert/strict";
import { getBainaBoxVendor } from "../src/lib/bainaBoxData.ts";

console.log("=== Testing Baina Order Quantity UX Refinement ===");

const ram = getBainaBoxVendor("ram-asrey");
assert.ok(ram);

// Simulate the BainaBoxOrderPanel quantity state logic
let qty = {};

function setCount(id, next) {
  if (next <= 0) {
    const nextMap = { ...qty };
    delete nextMap[id];
    qty = nextMap;
  } else {
    qty = { ...qty, [id]: next };
  }
}

function computeLines(vendor, qtyMap) {
  return vendor.products
    .map(p => ({ ...p, qty: qtyMap[p.id] ?? 0 }))
    .filter(p => p.qty > 0);
}

// 1. Initial signature product selected
setCount("ram-4", 1);
let lines = computeLines(ram, qty);
assert.equal(lines.length, 1);
assert.equal(lines[0].id, "ram-4");
assert.equal(lines[0].qty, 1);
assert.equal(lines[0].qty * lines[0].price, 749);
console.log("✓ Initial signature product active with 1 box");

// 2. Add Box for Kaju Katli (ram-1)
const count1 = qty["ram-1"] ?? 0;
setCount("ram-1", count1 > 0 ? count1 + 1 : 1);
lines = computeLines(ram, qty);
assert.equal(lines.length, 2);
assert.equal(lines.find(l => l.id === "ram-1").qty, 1);
console.log("✓ Add Box adds new product with quantity 1");

// 3. Add Box again for Kaju Katli (ram-1) from catalogue
const count2 = qty["ram-1"] ?? 0;
setCount("ram-1", count2 > 0 ? count2 + 1 : 1);
lines = computeLines(ram, qty);
assert.equal(lines.find(l => l.id === "ram-1").qty, 2);
assert.equal(lines.find(l => l.id === "ram-1").qty * lines.find(l => l.id === "ram-1").price, 2 * 799);
console.log("✓ Add Box on existing product increments quantity to 2");

// 4. Stepper in Your Baina Order: increment ram-4 to 2
setCount("ram-4", 2);
lines = computeLines(ram, qty);
assert.equal(lines.find(l => l.id === "ram-4").qty, 2);
let totalBoxes = lines.reduce((n, l) => n + l.qty, 0);
let totalAmount = lines.reduce((n, l) => n + l.qty * l.price, 0);
assert.equal(totalBoxes, 4); // 2 of ram-4 (₹749) + 2 of ram-1 (₹799)
assert.equal(totalAmount, 2 * 749 + 2 * 799); // 1498 + 1598 = 3096
console.log(`✓ Order total correctly calculated for 4 boxes: ₹${totalAmount}`);

// 5. Stepper in Your Baina Order: decrement ram-1 down to 0
setCount("ram-1", 1);
setCount("ram-1", 0);
lines = computeLines(ram, qty);
assert.equal(lines.length, 1);
assert.equal(lines[0].id, "ram-4");
assert.equal(lines[0].qty, 2);
totalBoxes = lines.reduce((n, l) => n + l.qty, 0);
totalAmount = lines.reduce((n, l) => n + l.qty * l.price, 0);
assert.equal(totalBoxes, 2);
assert.equal(totalAmount, 2 * 749);
console.log("✓ Decrementing item to 0 removes it from the order lines immediately");

console.log("=== All Quantity UX Tests Passed Successfully! ===");
