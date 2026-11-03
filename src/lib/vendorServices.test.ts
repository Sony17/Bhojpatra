/**
 * Which services a vendor opted into at onboarding — the helper the vendor
 * dashboard gates every service-specific surface with.
 *
 * Run with `npx tsx --test src/lib/vendorServices.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAnyService, isServiceOpted, optedServices, type VendorServicesInput } from "@/lib/vendorServices";

const dish = { name: "Dal", diet: "veg" } as never;
const plated = (n = 1): VendorServicesInput["menu"] =>
  [{ categoryId: "main", items: Array.from({ length: n }, () => dish) }] as never;

test("single-service vendor: stall-only sees only Single Stall", () => {
  const r = optedServices({ serviceCategories: ["single-stall"] });
  assert.deepEqual(r.ids, ["stall"]);
  assert.equal(r.source, "declared");
  assert.deepEqual(r.categories, ["single-stall"]);
});

test("declared selection wins over leftover data for a skipped service", () => {
  const r = optedServices({
    serviceCategories: ["single-stall"],
    menu: plated(3), // plated dishes are shared with Single Stall, not Feast
    bainaBoxes: [{ id: "b" }] as never,
    counters: [{ id: "c" }] as never,
    cutleryTier: "Premium" as never,
  });
  assert.deepEqual(r.ids, ["stall"]);
});

test("multi-service vendor: Feast + Baina, in handover order", () => {
  const r = optedServices({ serviceCategories: ["baina-box", "full-catering"], cateringComponents: { counters: false, extras: false, essentials: false, addons: false } as never });
  assert.deepEqual(r.ids, ["feast", "baina"]);
  assert.deepEqual(r.categories, ["full-catering", "baina-box"]);
});

test("Feast components follow the recorded toggles and only exist under Feast", () => {
  const r = optedServices({
    serviceCategories: ["full-catering"],
    cateringComponents: { counters: true, extras: false, essentials: false, addons: true } as never,
  });
  assert.deepEqual(r.ids, ["feast", "counters", "addons"]);
  // Components recorded but Feast not chosen -> not shown.
  const s = optedServices({
    serviceCategories: ["single-stall"],
    cateringComponents: { counters: true, extras: true, essentials: true, addons: true } as never,
  });
  assert.deepEqual(s.ids, ["stall"]);
});

test("Feast vendor predating cateringComponents: components only with data", () => {
  const r = optedServices({ serviceCategories: ["full-catering"], counters: [{ id: "c" }] as never });
  assert.deepEqual(r.ids, ["feast", "counters"]);
});

test("legacy `live-stall` / `essential` categories map to Counters / Essentials", () => {
  assert.deepEqual(optedServices({ serviceCategories: ["live-stall", "essential"] }).ids, ["counters", "essentials"]);
});

test("unknown category ids are ignored (falls back to inference)", () => {
  const r = optedServices({ serviceCategories: ["nonsense"], bainaBoxes: [{ id: "b" }] as never });
  assert.equal(r.source, "inferred");
  assert.deepEqual(r.ids, ["baina"]);
});

test("legacy vendor with no selection: inferred from what they sell", () => {
  const r = optedServices({
    menu: plated(2),
    stallConfig: { categories: ["chaat"] } as never,
    bainaBoxes: [{ id: "b" }] as never,
    customOfferings: [{ id: "x" }] as never,
    essentialService: {} as never,
  });
  assert.equal(r.source, "inferred");
  assert.deepEqual(r.ids, ["feast", "stall", "baina", "extras", "essentials"]);
});

test("empty / null input resolves to no services", () => {
  for (const v of [null, undefined, {}, { menu: [{ categoryId: "main", items: [] }] as never }]) {
    assert.deepEqual(optedServices(v).ids, []);
  }
});

test("isServiceOpted / hasAnyService", () => {
  const v = { serviceCategories: ["baina-box"] };
  assert.equal(isServiceOpted(v, "baina"), true);
  assert.equal(isServiceOpted(v, "feast"), false);
  assert.equal(hasAnyService(optedServices(v), "feast", "baina"), true);
  assert.equal(hasAnyService(optedServices(v), "feast", "stall"), false);
});
