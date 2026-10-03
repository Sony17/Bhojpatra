import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVendorMenuInput,
  cleanStallConfig,
  cleanBainaDetails,
  cleanBainaBoxes,
  cleanCutleryTier,
  cleanEssentialService,
  type VendorMenuItem,
  type VendorMenuSection,
  type CutleryTierOption,
} from "./vendorMenus";

/* ── 1. Catering Basics Validation & Persistence ──────────────────────────── */
test("catering basics: package name, about, bestFor, minPax, and leadHours validate and persist", () => {
  const payload = {
    business: "Royal Awadh Catering",
    city: "Lucknow",
    state: "Uttar Pradesh",
    priceFrom: 850,
    packageName: "Shahi Dawat Feast",
    about: "Traditional slow-cooked Awadhi cuisine passed down through three generations.",
    bestFor: ["Weddings", "Receptions", "Corporate"],
    minPax: 60,
    leadHours: 72,
    menu: [],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.packageName, "Shahi Dawat Feast");
    assert.equal(check.value.about, "Traditional slow-cooked Awadhi cuisine passed down through three generations.");
    assert.deepEqual(check.value.bestFor, ["Weddings", "Receptions", "Corporate"]);
    assert.equal(check.value.minPax, 60);
    assert.equal(check.value.leadHours, 72);
  }
});

/* ── 2. Tier Pricing & Quota Validation ───────────────────────────────────── */
test("tier pricing & quotas: Silver/Gold rates and 0..24 quotas validate on menu sections", () => {
  const payload = {
    business: "Imperial Banquets",
    city: "Lucknow",
    priceFrom: 799,
    goldSpecialization: "Dum Pukht Specialist",
    menu: [
      {
        categoryId: "welcome",
        perPlate: 40,
        tierItems: { Silver: 1, Gold: 2 },
        items: [{ name: "Jaljeera", diet: "veg" }],
      },
      {
        categoryId: "starters",
        perPlate: 70,
        tierItems: { Silver: 2, Gold: 5 },
        items: [{ name: "Paneer Tikka", diet: "veg" }],
      },
      {
        categoryId: "main",
        perPlate: 120,
        tierItems: { Silver: 3, Gold: 6 },
        items: [{ name: "Paneer Butter Masala", diet: "veg" }],
      },
      {
        categoryId: "breads",
        perPlate: 35,
        tierItems: { Silver: 1, Gold: 2 },
        items: [{ name: "Butter Naan", diet: "veg" }],
      },
      {
        categoryId: "sweets",
        perPlate: 80,
        tierItems: { Silver: 1, Gold: 3 },
        items: [{ name: "Gulab Jamun", diet: "veg" }],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.priceFrom, 799);
    assert.equal(check.value.goldSpecialization, "Dum Pukht Specialist");
    assert.equal(check.value.menu.length, 5);
    assert.deepEqual(check.value.menu[0].tierItems, { Silver: 1, Gold: 2 });
    assert.deepEqual(check.value.menu[1].tierItems, { Silver: 2, Gold: 5 });
    assert.deepEqual(check.value.menu[2].tierItems, { Silver: 3, Gold: 6 });
  }
});

/* ── 3. Course Hierarchy & Plated Course Structure ────────────────────────── */
test("course hierarchy: supports 5 standard plated courses with dish rosters", () => {
  const standardCourses = ["welcome", "starters", "main", "breads", "sweets"];
  const sections: VendorMenuSection[] = standardCourses.map((catId, idx) => ({
    categoryId: catId,
    perPlate: 50 + idx * 10,
    items: [
      { name: `Dish A in ${catId}`, diet: "veg" },
      { name: `Dish B in ${catId}`, diet: "non-veg" },
    ],
  }));

  const payload = {
    business: "Hierarchy Test Caterers",
    city: "Lucknow",
    priceFrom: 650,
    menu: sections,
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.menu.length, 5);
    const categoryIds = check.value.menu.map((s) => s.categoryId);
    assert.deepEqual(categoryIds, standardCourses);
  }
});

/* ── 4. Dish Creation, Update, and Removal (VendorMenuItem) ───────────────── */
test("dish operations: items preserve description, photo, price, and tier restrictions", () => {
  const item: VendorMenuItem = {
    name: "Galouti Kebab with Ulta Tawa Parantha",
    diet: "non-veg",
    desc: "Melt in mouth minced mutton kebabs scented with potli masala",
    photo: "/api/vendor/photo/galouti-1",
    price: 180,
    tiers: ["Gold"],
  };

  const payload = {
    business: "Kebab Master",
    city: "Lucknow",
    priceFrom: 800,
    menu: [
      {
        categoryId: "starters",
        perPlate: 90,
        items: [item],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    const savedItem = check.value.menu[0].items[0];
    assert.equal(savedItem.name, "Galouti Kebab with Ulta Tawa Parantha");
    assert.equal(savedItem.diet, "non-veg");
    assert.equal(savedItem.desc, "Melt in mouth minced mutton kebabs scented with potli masala");
    assert.equal(savedItem.price, 180);
    assert.deepEqual(savedItem.tiers, ["Gold"]);
  }
});

/* ── 5. Dietary Classification Validation ─────────────────────────────────── */
test("dietary classification: accurately distinguishes veg and non-veg dishes", () => {
  const payload = {
    business: "Dual Kitchen Caterers",
    city: "Lucknow",
    priceFrom: 700,
    menu: [
      {
        categoryId: "starters",
        perPlate: 75,
        items: [
          { name: "Paneer Tikka", diet: "veg" as const },
          { name: "Chicken Malai Tikka", diet: "non-veg" as const },
        ],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.menu[0].items[0].diet, "veg");
    assert.equal(check.value.menu[0].items[1].diet, "non-veg");
  }
});

/* ── 6. Tier Assignment for Dishes ────────────────────────────────────────── */
test("tier assignment: dishes can be restricted to Gold or available across Silver and Gold", () => {
  const payload = {
    business: "Tiered Offerings Kitchen",
    city: "Lucknow",
    priceFrom: 799,
    menu: [
      {
        categoryId: "starters",
        perPlate: 80,
        items: [
          { name: "Hara Bhara Kebab", diet: "veg" as const, tiers: ["Silver", "Gold"] as ("Silver" | "Gold")[] },
          { name: "Tandoori Jheenga", diet: "non-veg" as const, tiers: ["Gold"] as ("Silver" | "Gold")[] },
        ],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    const items = check.value.menu[0].items;
    assert.deepEqual(items[0].tiers, ["Silver", "Gold"]);
    assert.deepEqual(items[1].tiers, ["Gold"]);
  }
});

/* ── 7. Signature Dish State (Featured Dishes) ────────────────────────────── */
test("signature dishes: featured dish names must be in visible menu and capped at 4", () => {
  const menu: VendorMenuSection[] = [
    {
      categoryId: "starters",
      perPlate: 80,
      items: [
        { name: "Dish 1", diet: "veg" },
        { name: "Dish 2", diet: "veg" },
        { name: "Dish 3", diet: "veg" },
        { name: "Dish 4", diet: "veg" },
        { name: "Dish 5", diet: "veg" },
      ],
    },
  ];

  // Exactly 4 valid featured dishes
  const validPayload = {
    business: "Signature Test",
    city: "Lucknow",
    priceFrom: 600,
    menu,
    featured: ["Dish 1", "Dish 2", "Dish 3", "Dish 4"],
  };
  const validCheck = validateVendorMenuInput(validPayload);
  assert.equal(validCheck.ok, true);
  if (validCheck.ok) {
    assert.equal(validCheck.value.featured?.length, 4);
    assert.deepEqual(validCheck.value.featured, ["Dish 1", "Dish 2", "Dish 3", "Dish 4"]);
  }

  // 0 featured dishes is valid
  const emptyFeaturedPayload = {
    business: "Signature Test",
    city: "Lucknow",
    priceFrom: 600,
    menu,
    featured: [],
  };
  const emptyCheck = validateVendorMenuInput(emptyFeaturedPayload);
  assert.equal(emptyCheck.ok, true);

  // Invalid count (e.g. 2 featured dishes when platform requires 4 or none)
  const invalidCountPayload = {
    business: "Signature Test",
    city: "Lucknow",
    priceFrom: 600,
    menu,
    featured: ["Dish 1", "Dish 2"],
  };
  const invalidCheck = validateVendorMenuInput(invalidCountPayload);
  assert.equal(invalidCheck.ok, false);
});

/* ── 8. Live Food Counter Persistence ─────────────────────────────────────── */
test("live food counters: persist under counters with items, extras, and per-plate pricing", () => {
  const payload = {
    business: "Live Counters Caterers",
    city: "Lucknow",
    priceFrom: 850,
    menu: [],
    counters: [
      {
        id: "chaat",
        price: 65,
        items: ["Golgappa / Pani Puri", "Aloo Tikki Chaat", "Papdi Chaat"],
        extras: [{ name: "Palak Patta Chaat", diet: "veg" as const }],
      },
      {
        id: "pan",
        price: 45,
        items: ["Banarasi Meetha Paan", "Chocolate Paan"],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.counters?.length, 2);
    assert.equal(check.value.counters[0].id, "chaat");
    assert.equal(check.value.counters[0].price, 65);
    assert.equal(check.value.counters[0].extras?.[0].name, "Palak Patta Chaat");
    assert.equal(check.value.counters[1].id, "pan");
    assert.equal(check.value.counters[1].price, 45);
  }
});

/* ── 9. Hospitality Extras Persistence ────────────────────────────────────── */
test("hospitality extras: persist services under counters with flat/per-plate rates and no diet marks", () => {
  const payload = {
    business: "Full Hospitality Banquet",
    city: "Lucknow",
    priceFrom: 900,
    menu: [],
    counters: [
      {
        id: "decor",
        price: 35000,
        extras: [{ name: "Fresh Rose Mandap Decor" }],
      },
      {
        id: "tableware",
        price: 40,
        items: [],
      },
    ],
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    const decor = check.value.counters?.find((c) => c.id === "decor");
    assert.ok(decor);
    assert.equal(decor.price, 35000);
    // Services do not have dietary markings on extras
    assert.equal(decor.extras?.[0].diet, undefined);
  }
});

/* ── 10. Service Crew Essentials Persistence ──────────────────────────────── */
test("service crew essentials: cleanEssentialService persists includes and perGuest rate", () => {
  const rawService = {
    perGuest: 25,
    includes: [
      "Uniformed Stewards",
      "Buffet Tables & Linens",
      "Acrylic Food Labels",
      "Handwash Station",
      "Waste Bins",
      "Hygiene Crew",
    ],
  };

  const cleaned = cleanEssentialService(rawService);
  assert.ok(cleaned);
  assert.equal(cleaned.perGuest, 25);
  assert.equal(cleaned.includes.length, 6);
  assert.ok(cleaned.includes.includes("Uniformed Stewards"));
  assert.ok(cleaned.includes.includes("Handwash Station"));
});

/* ── 11. Tableware Tier Persistence ───────────────────────────────────────── */
test("tableware tiers: cleanCutleryTier validates all 4 standard packages", () => {
  const validTiers: CutleryTierOption[] = ["essential", "standard", "premium", "ultra"];
  for (const tier of validTiers) {
    assert.equal(cleanCutleryTier(tier), tier);
  }
  assert.equal(cleanCutleryTier("invalid-tier"), undefined);
});

/* ── 12. Single Stall Category Pricing ────────────────────────────────────── */
test("single stall pricing: categoryPricing maintains independent fixed rates", () => {
  const rawConfig = {
    categories: ["chaat", "pizza", "south-indian"],
    categoryPricing: {
      chaat: { fixedPerPlate: 60, minPaxGuarantee: 50 },
      pizza: { fixedPerPlate: 120, minPaxGuarantee: 40 },
      "south-indian": { fixedPerPlate: 70, minPaxGuarantee: 60 },
    },
  };

  const cleaned = cleanStallConfig(rawConfig);
  assert.ok(cleaned);
  assert.equal(cleaned.categories.length, 3);
  assert.ok(cleaned.categoryPricing);
  assert.equal(cleaned.categoryPricing["chaat"].fixedPerPlate, 60);
  assert.equal(cleaned.categoryPricing["pizza"].fixedPerPlate, 120);
  assert.equal(cleaned.categoryPricing["south-indian"].fixedPerPlate, 70);
});

/* ── 13. Stall Minimum Pax Validation ─────────────────────────────────────── */
test("stall minimum pax: independent minPax guarantees validate per category", () => {
  const rawConfig = {
    categories: ["momo", "waffle"],
    categoryPricing: {
      momo: { fixedPerPlate: 70, minPaxGuarantee: 35 },
      waffle: { fixedPerPlate: 85, minPaxGuarantee: 25 },
    },
  };

  const cleaned = cleanStallConfig(rawConfig);
  assert.ok(cleaned);
  assert.equal(cleaned.categoryPricing?.["momo"].minPaxGuarantee, 35);
  assert.equal(cleaned.categoryPricing?.["waffle"].minPaxGuarantee, 25);
});

/* ── 14. Stall Equipment & Cutlery Persistence ────────────────────────────── */
test("stall equipment & cutlery: persists apparatus list and cutlery type", () => {
  const rawConfig = {
    categories: ["chaat"],
    equipment: ["Charcoal Sigdi", "Inverted Ulta Tawa", "Buffet Warmers"],
    cutlery: "Biodegradable Bagasse",
  };

  const cleaned = cleanStallConfig(rawConfig);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.equipment, ["Charcoal Sigdi", "Inverted Ulta Tawa", "Buffet Warmers"]);
  assert.equal(cleaned.cutlery, "Biodegradable Bagasse");
});

/* ── 15. Baina Studio Details ─────────────────────────────────────────────── */
test("baina studio details: cleanBainaDetails validates studioName, story, minOrder, leadDays", () => {
  const rawDetails = {
    studioName: "Awadh Confectioners",
    story: "Generational khoya mithai made with pure bilona ghee and organic nuts.",
    minOrderBoxes: 30,
    leadDays: 4,
    packaging: "velvet",
  };

  const cleaned = cleanBainaDetails(rawDetails);
  assert.ok(cleaned);
  assert.equal(cleaned.studioName, "Awadh Confectioners");
  assert.equal(cleaned.story, "Generational khoya mithai made with pure bilona ghee and organic nuts.");
  assert.equal(cleaned.minOrderBoxes, 30);
  assert.equal(cleaned.leadDays, 4);
  assert.equal(cleaned.packaging, "velvet");
});

/* ── 16. Baina Box CRUD Operations ────────────────────────────────────────── */
test("baina box catalog: supports ½ kg price, 1 kg price, custom sizes and photos", () => {
  const rawBoxes = [
    {
      name: "Shahi Kaju Assortment",
      contents: "Kaju Katli, Kaju Peda, Roasted Cashews",
      price: 500,
      price1kg: 950,
      customSizes: [
        { label: "250 g", price: 275 },
        { label: "2 kg", price: 1800 },
      ],
      photo: "/api/vendor/photo/baina-1",
    },
  ];

  const check = cleanBainaBoxes(rawBoxes);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.length, 1);
    const box = check.value[0];
    assert.equal(box.name, "Shahi Kaju Assortment");
    assert.equal(box.price, 500);
    assert.equal(box.price1kg, 950);
    assert.equal(box.customSizes?.length, 2);
    assert.equal(box.customSizes?.[0].label, "250 g");
    assert.equal(box.photo, "/api/vendor/photo/baina-1");
  }
});

/* ── 17. Baina 5-Box Maximum Limit ────────────────────────────────────────── */
test("baina limit: strictly rejects catalog when more than 5 boxes are provided", () => {
  const sixBoxes = Array.from({ length: 6 }, (_, i) => ({
    name: `Sweet Box ${i + 1}`,
    contents: "Assorted sweets",
    price: 400 + i * 50,
  }));

  const check = cleanBainaBoxes(sixBoxes);
  assert.equal(check.ok, false);
  if (!check.ok) {
    assert.match(check.error, /maximum of 5 Baina boxes/i);
  }

  // Exactly 5 boxes must succeed
  const fiveBoxes = sixBoxes.slice(0, 5);
  const okCheck = cleanBainaBoxes(fiveBoxes);
  assert.equal(okCheck.ok, true);
  if (okCheck.ok) {
    assert.equal(okCheck.value.length, 5);
  }
});

/* ── 18. Baina Luxury Packaging Styles ────────────────────────────────────── */
test("baina packaging: validates velvet, gold-foil, eco-kraft, and brocade styles", () => {
  const styles = ["velvet", "gold-foil", "eco-kraft", "brocade"] as const;
  for (const style of styles) {
    const cleaned = cleanBainaDetails({ packaging: style });
    assert.equal(cleaned?.packaging, style);
  }

  const invalid = cleanBainaDetails({ packaging: "cheap-plastic" });
  assert.equal(invalid?.packaging, undefined);
});

/* ── 19. Branch-Specific Builder Selection ────────────────────────────────── */
test("branch-specific builders: serviceCategories controls active branches", () => {
  const caterer = { serviceCategories: ["full-catering"] };
  const stall = { serviceCategories: ["single-stall"] };
  const multi = { serviceCategories: ["full-catering", "single-stall", "baina-box"] };

  const getBranches = (categories: string[]) => {
    const list: string[] = [];
    if (categories.includes("full-catering")) list.push("catering");
    if (categories.includes("single-stall")) list.push("stall");
    if (categories.includes("baina-box")) list.push("baina");
    return list;
  };

  assert.deepEqual(getBranches(caterer.serviceCategories), ["catering"]);
  assert.deepEqual(getBranches(stall.serviceCategories), ["stall"]);
  assert.deepEqual(getBranches(multi.serviceCategories), ["catering", "stall", "baina"]);
});

/* ── 20. Legacy Vendor Records Backward Compatibility ─────────────────────── */
test("legacy vendor compatibility: older vendor records without V2 builder fields load safely", () => {
  const legacyRecord = {
    business: "Old City Caterers",
    city: "Lucknow",
    state: "Uttar Pradesh",
    priceFrom: 450,
    menu: [
      {
        categoryId: "main",
        perPlate: 120,
        items: [{ name: "Dal Makhani", diet: "veg" as const }],
      },
    ],
  };

  const check = validateVendorMenuInput(legacyRecord);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.business, "Old City Caterers");
    assert.equal(check.value.priceFrom, 450);
    assert.equal(check.value.packageName, undefined);
    assert.equal(check.value.stallConfig, undefined);
    assert.equal(check.value.bainaDetails, undefined);
    assert.equal(check.value.bainaBoxes, undefined);
    assert.equal(check.value.cutleryTier, undefined);
  }
});

/* ── 21. Catering Components Sub-Selection ────────────────────────────────── */
test("catering sub-components: counters, extras, essentials, addons validate and persist", () => {
  const payload = {
    business: "Royal Awadh Grand",
    city: "Lucknow",
    priceFrom: 799,
    menu: [],
    cateringComponents: {
      counters: true,
      extras: false,
      essentials: true,
      addons: false,
    },
  };

  const check = validateVendorMenuInput(payload);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.deepEqual(check.value.cateringComponents, {
      counters: true,
      extras: false,
      essentials: true,
      addons: false,
    });
  }
});

/* ── 22. Baina Occasions Multi-Select ─────────────────────────────────────── */
test("baina occasions: cleanBainaDetails validates and cleans occasions list", () => {
  const rawDetails = {
    studioName: "Mithai Atelier",
    story: "Generational khoya crafting",
    occasions: ["Weddings", "Tilak", "Diwali", "Corporate", "Weddings"], // with duplicate
  };

  const cleaned = cleanBainaDetails(rawDetails);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.occasions, ["Weddings", "Tilak", "Diwali", "Corporate"]);
});

