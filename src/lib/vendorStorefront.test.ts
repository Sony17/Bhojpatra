/**
 * Storefront ↔ Single Stall hand-off — which stall a Book button sells, at
 * what price, where it links, and what the public vendor payload exposes.
 *
 * Run with `npx tsx --test src/lib/vendorStorefront.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { vendorListings, type MenuCategory } from "@/lib/data";
import {
  brandKey,
  cityParams,
  collectStalls,
  listingCta,
  resolveBookableStall,
  stallBookHref,
  stallBriefsFor,
  storefrontCta,
} from "@/lib/vendorStorefront";
import {
  hasPublicOffering,
  publicStallConfig,
  stallTermsFor,
} from "@/lib/vendorMenus";

const cat = (
  id: string,
  vendors: MenuCategory["vendors"],
): MenuCategory => ({
  id,
  name: id,
  nameHi: id,
  icon: "🍽️",
  blurb: "",
  blurbHi: "",
  vendors,
});

const roster: MenuCategory[] = [
  cat("main", [
    {
      id: "mc-awadhi",
      name: "Awadhi Royal",
      rating: 4.8,
      reviews: 10,
      perPlate: 120,
      image: "",
      items: [{ id: "a-0", name: "Korma", diet: "non-veg" }],
    },
    {
      id: "VEN-LIVE1",
      name: "Live Kitchen",
      rating: 0,
      reviews: 0,
      perPlate: 200,
      image: "",
      live: true,
      city: "Kanpur",
      menuType: "varied",
      stallTerms: { minPax: 50, leadHours: 48, minPaxGuarantee: 80 },
      items: [
        { id: "l-0", name: "Dal", diet: "veg", price: 90 },
        { id: "l-1", name: "Paneer", diet: "veg" },
      ],
    },
  ]),
  cat("starters", [
    {
      id: "mc-awadhi",
      name: "Awadhi Royal",
      rating: 4.8,
      reviews: 10,
      perPlate: 70,
      image: "",
      items: [{ id: "a-1", name: "Kebab", diet: "non-veg" }],
    },
  ]),
];

test("stalls fold per vendor and price like the wizard", () => {
  const stalls = collectStalls(roster);
  const awadhi = stalls.find((s) => s.stallId === "mc-awadhi")!;
  assert.equal(awadhi.courses.length, 2);
  assert.equal(awadhi.fromPerPlate, 70); // cheapest set course
  const live = stalls.find((s) => s.stallId === "VEN-LIVE1")!;
  // Varied: cheapest dish, a dish with no own price bills the course rate.
  assert.equal(live.fromPerPlate, 90);
  assert.equal(live.minGuests, 80);
  assert.equal(live.leadHours, 48);
});

test("curated samples bridge by brand name; real vendors by id only", () => {
  const stalls = collectStalls(roster);
  assert.equal(brandKey("Awadhi Royal Caterers"), "awadhi-royal");
  const sample = { id: "vl-1", name: "Awadhi Royal Caterers" };
  assert.equal(
    resolveBookableStall(sample, stalls, { allowNameBridge: true })?.stallId,
    "mc-awadhi",
  );
  // A same-named real vendor must NOT borrow the seed's stall.
  assert.equal(
    resolveBookableStall({ id: "VEN-X", name: "Awadhi Royal" }, stalls, {
      allowNameBridge: false,
    }),
    null,
  );
  const briefs = stallBriefsFor(
    [{ ...sample, sample: true }, { id: "VEN-LIVE1", name: "Live Kitchen" }],
    stalls,
  );
  assert.equal(briefs["vl-1"]?.fromPerPlate, 70);
  assert.equal(briefs["VEN-LIVE1"]?.stallId, "VEN-LIVE1");
});

test("book links always carry the vendor's city", () => {
  assert.deepEqual(cityParams("Lucknow"), { city: "lucknow" });
  assert.deepEqual(cityParams("Kanpur"), { loc: "Kanpur" });
  assert.deepEqual(cityParams(""), {});
  assert.equal(
    stallBookHref({ vendorId: "vl-1", city: "Lucknow", counter: "chaat" }),
    "/book/stall?vendor=vl-1&city=lucknow&counter=chaat",
  );
});

test("CTA is gated on a bookable stall", () => {
  const decor = vendorListings.find((v) => v.id === "vl-21")!;
  assert.equal(listingCta({ ...decor, stall: null }).kind, "enquire");
  assert.equal(listingCta(decor).kind, "enquire"); // no single-stall category
  const awadhi = vendorListings.find((v) => v.id === "vl-1")!;
  const cta = listingCta({
    ...awadhi,
    stall: { stallId: "mc-awadhi", fromPerPlate: 70 },
  });
  assert.equal(cta.kind, "stall");
  assert.equal(cta.kind === "stall" && cta.price, 70);
  // Roster answered and the vendor isn't in it → never a stall Book.
  assert.notEqual(listingCta({ ...awadhi, stall: null }).kind, "stall");
  // Boxes-only / service-only vendors route to their own flows.
  assert.equal(
    storefrontCta({
      id: "V",
      categories: ["baina-box"],
      stall: null,
      bainaHref: "#baina-order",
    }).kind,
    "baina",
  );
  assert.equal(
    storefrontCta({ id: "V", categories: ["essential"], stall: null }).kind,
    "service",
  );
});

test("menu payload carries stall terms; public profile is whitelisted", () => {
  assert.deepEqual(
    stallTermsFor(
      {
        minPax: 40,
        leadHours: 24,
        stallConfig: {
          categories: ["chaat"],
          categoryPricing: { chaat: { fixedPerPlate: 150, minPaxGuarantee: 60 } },
        },
      },
      "chaat",
    ),
    {
      stallTerms: {
        fixedPerPlate: 150,
        minPaxGuarantee: 60,
        minPax: 40,
        leadHours: 24,
      },
    },
  );
  assert.deepEqual(stallTermsFor({}, "main"), {});
  const pub = publicStallConfig({
    categories: ["chaat"],
    categoryPricing: { chaat: { fixedPerPlate: 150, minPaxGuarantee: 0 } },
    menus: { chaat: [{ name: "Tikki", diet: "veg" }] },
  });
  assert.deepEqual(pub, {
    stallConfig: { categories: ["chaat"], terms: { chaat: { fixedPerPlate: 150 } } },
  });
  assert.equal(
    hasPublicOffering({
      menu: [],
      bainaBoxes: [{ name: "Box", contents: "", price: 500 }],
    }),
    true,
  );
  assert.equal(
    hasPublicOffering({ menu: [], essentialService: { perGuest: 0, includes: [] } }),
    true,
  );
  assert.equal(hasPublicOffering({ menu: [] }), false);
});
