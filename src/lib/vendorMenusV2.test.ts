/**
 * Tests for Vendor V2 Backend Data Contracts and Sanitizers.
 *
 * Run with `npx tsx --test src/lib/vendorMenusV2.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanBadges,
  cleanBainaBoxes,
  cleanBainaDetails,
  cleanBestFor,
  cleanCustomOfferings,
  cleanCutleryTier,
  cleanDietaryOffering,
  cleanServiceCities,
  cleanStallConfig,
  toPublicVendorProfile,
  toVendorListing,
  validateVendorMenuInput,
  type LiveVendorRecord,
} from "@/lib/vendorMenus";

/* ── 1. Dietary Offering Cleaner ────────────────────────────────────────── */

test("cleanDietaryOffering handles valid values and normalizes whitespace/case", () => {
  assert.equal(cleanDietaryOffering("veg"), "veg");
  assert.equal(cleanDietaryOffering("Non-Veg"), "non-veg");
  assert.equal(cleanDietaryOffering("  BOTH  "), "both");
});

test("cleanDietaryOffering rejects invalid values", () => {
  assert.equal(cleanDietaryOffering("vegan"), undefined);
  assert.equal(cleanDietaryOffering(""), undefined);
  assert.equal(cleanDietaryOffering(null), undefined);
  assert.equal(cleanDietaryOffering(123), undefined);
});

/* ── 2. Cutlery Tier Cleaner ────────────────────────────────────────────── */

test("cleanCutleryTier validates allowed tiers", () => {
  assert.equal(cleanCutleryTier("essential"), "essential");
  assert.equal(cleanCutleryTier("Standard"), "standard");
  assert.equal(cleanCutleryTier(" PREMIUM "), "premium");
  assert.equal(cleanCutleryTier("ultra"), "ultra");
});

test("cleanCutleryTier rejects unknown tiers", () => {
  assert.equal(cleanCutleryTier("plastic"), undefined);
  assert.equal(cleanCutleryTier(""), undefined);
  assert.equal(cleanCutleryTier(null), undefined);
});

/* ── 3. Service Cities Cleaner ──────────────────────────────────────────── */

test("cleanServiceCities cleans, dedupes, and slices cities", () => {
  const input = ["Lucknow", "lucknow", "  Kanpur  ", "Varanasi", ""];
  const cleaned = cleanServiceCities(input);
  assert.deepEqual(cleaned, ["Lucknow", "Kanpur", "Varanasi"]);
});

test("cleanServiceCities returns empty array for non-array input", () => {
  assert.deepEqual(cleanServiceCities(null), []);
  assert.deepEqual(cleanServiceCities("Lucknow"), []);
});

/* ── 4. Best For Cleaner ────────────────────────────────────────────────── */

test("cleanBestFor deduplicates and cleans event tags", () => {
  const input = ["Weddings", "corporate", "  Corporate  ", "Birthdays"];
  assert.deepEqual(cleanBestFor(input), ["Weddings", "corporate", "Birthdays"]);
});

/* ── 5. Custom Offerings Cleaner ────────────────────────────────────────── */

test("cleanCustomOfferings normalizes valid custom offerings and generates IDs if absent", () => {
  const input = [
    { title: "Pan Counter", blurb: "Live banarasi meetha pan", icon: "leaf" },
    { blurb: "Only blurb provided" },
  ];
  const cleaned = cleanCustomOfferings(input);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].title, "Pan Counter");
  assert.equal(cleaned[0].blurb, "Live banarasi meetha pan");
  assert.equal(cleaned[0].icon, "leaf");
  assert.ok(cleaned[0].id.length > 0);

  assert.equal(cleaned[1].title, "Custom Offering");
  assert.equal(cleaned[1].blurb, "Only blurb provided");
});

test("cleanCustomOfferings drops completely empty entries", () => {
  const input = [{ title: "", blurb: "" }, null];
  assert.deepEqual(cleanCustomOfferings(input), []);
});

/* ── 6. Single Stall Config Cleaner ─────────────────────────────────────── */

test("cleanStallConfig parses categories, category pricing, equipment, and cutlery", () => {
  const input = {
    categories: ["chaat", "live-woks", "chaat"],
    categoryPricing: {
      chaat: { fixedPerPlate: 180, minPaxGuarantee: 50 },
      "live-woks": { fixedPerPlate: 240, minPaxGuarantee: 100 },
    },
    equipment: ["Gas Burner", "Tandoor Bhatti", "Gas Burner"],
    cutlery: "Standard Chinaware",
  };
  const cleaned = cleanStallConfig(input);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.categories, ["chaat", "live-woks"]);
  assert.deepEqual(cleaned.categoryPricing, {
    chaat: { fixedPerPlate: 180, minPaxGuarantee: 50 },
    "live-woks": { fixedPerPlate: 240, minPaxGuarantee: 100 },
  });
  assert.deepEqual(cleaned.equipment, ["Gas Burner", "Tandoor Bhatti"]);
  assert.equal(cleaned.cutlery, "Standard Chinaware");
});

test("cleanStallConfig returns undefined for empty configurations", () => {
  assert.equal(cleanStallConfig({}), undefined);
  assert.equal(cleanStallConfig(null), undefined);
});

/* ── 7. Baina Details Cleaner ───────────────────────────────────────────── */

test("cleanBainaDetails parses artisan studio metadata", () => {
  const input = {
    studioName: "Awadhi Sweets Studio",
    story: "Handcrafted heirloom mithai since 1948.",
    minOrderBoxes: 25,
    leadDays: 3,
    packaging: "velvet",
  };
  const cleaned = cleanBainaDetails(input);
  assert.ok(cleaned);
  assert.equal(cleaned.studioName, "Awadhi Sweets Studio");
  assert.equal(cleaned.story, "Handcrafted heirloom mithai since 1948.");
  assert.equal(cleaned.minOrderBoxes, 25);
  assert.equal(cleaned.leadDays, 3);
  assert.equal(cleaned.packaging, "velvet");
});

test("cleanBainaDetails drops invalid packaging and returns undefined when empty", () => {
  const cleaned = cleanBainaDetails({ packaging: "plastic-bag" });
  assert.equal(cleaned, undefined);
});

/* ── 8. Baina Boxes Cleaner (Constraint: Maximum 5) ─────────────────────── */

test("cleanBainaBoxes enforces maximum 5 boxes limit", () => {
  const sixBoxes = [
    { name: "Box 1", price: 500 },
    { name: "Box 2", price: 550 },
    { name: "Box 3", price: 600 },
    { name: "Box 4", price: 650 },
    { name: "Box 5", price: 700 },
    { name: "Box 6", price: 750 },
  ];
  const result = cleanBainaBoxes(sixBoxes);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /maximum of 5/i);
  }
});

test("cleanBainaBoxes accepts up to 5 valid boxes", () => {
  const fiveBoxes = [
    { name: "Royal Kaju Box", price: 650, contents: "Kaju Katli, Anjeer Roll" },
    { name: "Moti Box", price: 450, contents: "Motichoor Ladoo" },
  ];
  const result = cleanBainaBoxes(fiveBoxes);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.length, 2);
    assert.equal(result.value[0].name, "Royal Kaju Box");
  }
});

/* ── 9. Recognition Badges Cleaner ──────────────────────────────────────── */

test("cleanBadges normalizes applied, granted, and applications", () => {
  const input = {
    applied: ["verified", "heritage", "fake-badge"],
    granted: ["verified"],
    applications: [
      {
        badgeKey: "heritage",
        status: "applied",
        appliedAt: "2026-05-01T10:00:00Z",
        criteria: { traditionalKitchen: true },
        details: { notes: "4th generation sweet makers" },
      },
      {
        badgeKey: "unknown",
        status: "applied",
      },
    ],
  };
  const cleaned = cleanBadges(input);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.applied, ["verified", "heritage"]);
  assert.deepEqual(cleaned.granted, ["verified"]);
  assert.equal(cleaned.applications?.length, 1);
  assert.equal(cleaned.applications?.[0].badgeKey, "heritage");
  assert.deepEqual(cleaned.applications?.[0].criteria, { traditionalKitchen: true });
});

/* ── 10. validateVendorMenuInput Integration & Backward Compatibility ────── */

test("validateVendorMenuInput accepts and normalizes full V2 payload", () => {
  const rawPayload = {
    business: "Royal Awadh Caterers",
    city: "Lucknow",
    state: "Uttar Pradesh",
    priceFrom: 850,
    menu: [
      {
        categoryId: "main",
        perPlate: 400,
        items: [
          {
            name: "Awadhi Dum Biryani",
            diet: "non-veg",
            desc: "Slow-cooked in sealed copper handi with fragrant ittar and saffron.",
          },
        ],
      },
    ],
    serviceCities: ["Lucknow", "Kanpur"],
    dietaryOffering: "both",
    minPax: 60,
    leadHours: 48,
    bestFor: ["Weddings", "Receptions"],
    packageName: "Shahi Awadh Grand Feast",
    goldSpecialization: "Dum Pukht Specialist",
    cutleryTier: "premium",
    customOfferings: [
      { title: "Paan Lounge", blurb: "Artisan meetha and zarda paan" },
    ],
    stallConfig: {
      categories: ["chaat"],
      categoryPricing: {
        chaat: { fixedPerPlate: 150, minPaxGuarantee: 40 },
      },
    },
    bainaDetails: {
      studioName: "Royal Mithai Ghar",
      story: "Authentic recipes from the royal court.",
      packaging: "brocade",
    },
    badges: {
      applied: ["verified"],
      granted: [],
    },
  };

  const check = validateVendorMenuInput(rawPayload);
  assert.equal(check.ok, true);
  if (check.ok) {
    const val = check.value;
    assert.equal(val.business, "Royal Awadh Caterers");
    assert.equal(val.dietaryOffering, "both");
    assert.equal(val.minPax, 60);
    assert.equal(val.leadHours, 48);
    assert.equal(val.packageName, "Shahi Awadh Grand Feast");
    assert.equal(val.goldSpecialization, "Dum Pukht Specialist");
    assert.equal(val.cutleryTier, "premium");
    assert.deepEqual(val.serviceCities, ["Lucknow", "Kanpur"]);
    assert.deepEqual(val.bestFor, ["Weddings", "Receptions"]);
    assert.equal(val.customOfferings?.length, 1);
    assert.equal(val.stallConfig?.categories[0], "chaat");
    assert.equal(val.bainaDetails?.studioName, "Royal Mithai Ghar");
    assert.deepEqual(val.badges?.applied, ["verified"]);
    assert.equal(
      val.menu[0].items[0].desc,
      "Slow-cooked in sealed copper handi with fragrant ittar and saffron.",
    );
  }
});

test("validateVendorMenuInput preserves backward compatibility for legacy records", () => {
  const legacyPayload = {
    business: "Legacy Standard Caterer",
    city: "Delhi",
    state: "Delhi",
    priceFrom: 600,
    menu: [
      {
        categoryId: "main",
        perPlate: 300,
        items: [{ name: "Dal Makhani", diet: "veg" }],
      },
    ],
  };

  const check = validateVendorMenuInput(legacyPayload);
  assert.equal(check.ok, true);
  if (check.ok) {
    const val = check.value;
    assert.equal(val.business, "Legacy Standard Caterer");
    assert.equal(val.dietaryOffering, undefined);
    assert.equal(val.minPax, undefined);
    assert.equal(val.leadHours, undefined);
    assert.equal(val.stallConfig, undefined);
    assert.equal(val.bainaDetails, undefined);
    assert.equal(val.badges, undefined);
    assert.equal(val.menu[0].items[0].desc, undefined);
  }
});

/* ── 11. toVendorListing & toPublicVendorProfile Passthrough ────────────── */

test("toVendorListing reflects dietaryOffering and leadHours", () => {
  const record: LiveVendorRecord = {
    id: "VEN-TEST01",
    business: "Test Veg Caterer",
    city: "Lucknow",
    state: "UP",
    cuisines: ["Awadhi"],
    priceFrom: 500,
    image: "/test.jpg",
    rating: 4.8,
    reviews: 12,
    verified: true,
    moderation: "Approved",
    dietaryOffering: "veg",
    leadHours: 72,
    menu: [
      {
        categoryId: "main",
        perPlate: 500,
        items: [{ name: "Paneer Tikka", diet: "veg" }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const listing = toVendorListing(record);
  assert.equal(listing.diet, "Veg");
  assert.equal(listing.leadDays, 3); // 72 hours / 24 = 3 days
});

test("toPublicVendorProfile passes through V2 extensions", () => {
  const record: LiveVendorRecord = {
    id: "VEN-TEST02",
    ownerUserId: "USR-001",
    business: "Profile Test Caterer",
    city: "Lucknow",
    state: "UP",
    cuisines: ["Awadhi"],
    priceFrom: 900,
    image: "/test.jpg",
    rating: 4.9,
    reviews: 20,
    verified: true,
    moderation: "Approved",
    packageName: "Royal Banquet",
    goldSpecialization: "Mughlai Kebab Master",
    cutleryTier: "ultra",
    minPax: 80,
    leadHours: 48,
    menu: [
      {
        categoryId: "main",
        perPlate: 900,
        items: [
          {
            name: "Galouti Kebab",
            diet: "non-veg",
            desc: "Melt in mouth smoked kebabs",
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profile = toPublicVendorProfile(record, ["/photo1.jpg"]);
  assert.ok(profile);
  assert.equal(profile.packageName, "Royal Banquet");
  assert.equal(profile.goldSpecialization, "Mughlai Kebab Master");
  assert.equal(profile.cutleryTier, "ultra");
  assert.equal(profile.minPax, 80);
  assert.equal(profile.leadHours, 48);
  assert.equal(profile.menu[0].items[0].desc, "Melt in mouth smoked kebabs");
});

test("toVendorListing: stall categories advertise the matching stall types", () => {
  const base = {
    id: "VEN-STALL", business: "Stall Co", city: "Lucknow", state: "UP",
    cuisines: ["Chaat"], priceFrom: 0, rating: 0, reviews: 0, verified: true,
    image: "", menu: [], createdAt: "", updatedAt: "",
  } as unknown as Parameters<typeof toVendorListing>[0];
  const listing = toVendorListing({
    ...base,
    serviceCategories: ["single-stall"],
    stallConfig: { categories: ["chaat", "juices", "ice-cream", "My Custom Stall"] },
  });
  assert.deepEqual(listing.offerings?.slice().sort(), ["chaat", "dessert", "live", "mocktail"]);
  // Feast counters and stall categories merge, without duplicates.
  const both = toVendorListing({
    ...base,
    counters: [{ id: "chaat" }, { id: "pan" }] as never,
    stallConfig: { categories: ["chaat"] },
  });
  assert.deepEqual(both.offerings?.slice().sort(), ["chaat", "pan"]);
  // No counters and no stall → no offerings key at all.
  assert.equal(toVendorListing(base).offerings, undefined);
});
