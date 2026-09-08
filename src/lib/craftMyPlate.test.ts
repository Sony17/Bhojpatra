import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFoodVendor } from "./craftMyPlate";
import { vendorListings, type VendorListing } from "./data";
import { toVendorListing, type LiveVendorRecord } from "./vendorMenus";

describe("Veg / Non-Veg Vendor Classification & FSSAI Indicators", () => {
  // Mock vendors for testing classification
  const vegVendor: VendorListing = {
    id: "v-veg",
    name: "Pure Veg Caterers",
    tiers: ["Gold"],
    rating: 4.8,
    reviews: 120,
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["North Indian"],
    mealTypes: ["Lunch", "Dinner"],
    diet: "Veg",
    priceFrom: 850,
    verified: true,
    image: "/img/veg.jpg",
  };

  const nonVegVendor: VendorListing = {
    id: "v-nonveg",
    name: "Royal Non-Veg Specialists",
    tiers: ["Gold"],
    rating: 4.7,
    reviews: 110,
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["Mughlai"],
    mealTypes: ["Dinner"],
    diet: "Non-Veg",
    priceFrom: 1150,
    verified: true,
    image: "/img/nonveg.jpg",
  };

  const mixedVendor: VendorListing = {
    id: "v-mixed",
    name: "Grand Feasts",
    tiers: ["Platinum"],
    rating: 4.9,
    reviews: 350,
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["North Indian", "Mughlai"],
    mealTypes: ["Lunch", "Dinner"],
    diet: "Veg & Non-Veg",
    priceFrom: 1300,
    verified: true,
    image: "/img/mixed.jpg",
  };

  const decorVendor: VendorListing = {
    id: "v-decor",
    name: "Utsav Mandap & Decor",
    tiers: ["Silver"],
    rating: 4.6,
    reviews: 80,
    city: "Jaipur",
    state: "Rajasthan",
    cuisines: ["Decor"],
    mealTypes: [],
    diet: "Veg", // Defaulted in static seeds, but clearly non-food
    priceFrom: 350,
    verified: true,
    image: "/img/decor.jpg",
  };

  /* ─────────────────────────────────────────────────────────────────────────
     1. Food vs Non-Food Vendor Detection
  ───────────────────────────────────────────────────────────────────────── */
  describe("isFoodVendor detection", () => {
    it("identifies standard caterers with meal courses as food vendors", () => {
      assert.equal(isFoodVendor(vegVendor), true);
      assert.equal(isFoodVendor(nonVegVendor), true);
      assert.equal(isFoodVendor(mixedVendor), true);
    });

    it("identifies existing catalogue caterers as food vendors", () => {
      const awadhi = vendorListings.find((v) => v.id === "vl-1");
      assert.ok(awadhi);
      assert.equal(isFoodVendor(awadhi), true);
    });

    it("correctly identifies decor-only specialists as non-food vendors", () => {
      assert.equal(isFoodVendor(decorVendor), false);

      const vl21 = vendorListings.find((v) => v.id === "vl-21"); // Utsav Decor & Events
      assert.ok(vl21);
      assert.equal(isFoodVendor(vl21), false);

      const vl22 = vendorListings.find((v) => v.id === "vl-22"); // Bandhan Mandap Decor
      assert.ok(vl22);
      assert.equal(isFoodVendor(vl22), false);
    });

    it("identifies vendors with declared catering categories as food vendors", () => {
      const singleStallVendor: VendorListing = {
        ...decorVendor,
        id: "v-stall",
        serviceCategories: ["single-stall"],
      };
      assert.equal(isFoodVendor(singleStallVendor), true);
    });

    it("identifies essential-service-only vendors without meal courses as non-food", () => {
      const essentialOnly: VendorListing = {
        ...decorVendor,
        id: "v-essential",
        serviceCategories: ["essential"],
        mealTypes: [],
      };
      assert.equal(isFoodVendor(essentialOnly), false);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     2. Authoritative Diet Classification (toVendorListing)
  ───────────────────────────────────────────────────────────────────────── */
  describe("toVendorListing classification", () => {
    it("derives 'Veg' when all visible items are vegetarian", () => {
      const record: LiveVendorRecord = {
        id: "VEN-TEST1",
        business: "Sattvik Rasoi",
        city: "Lucknow",
        state: "Uttar Pradesh",
        cuisines: ["North Indian"],
        priceFrom: 650,
        image: "/img/sattvik.jpg",
        rating: 4.8,
        reviews: 20,
        verified: true,
        menu: [
          {
            categoryId: "starters",
            perPlate: 60,
            items: [
              { name: "Paneer Tikka", diet: "veg" },
              { name: "Hara Bhara Kebab", diet: "veg" },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listing = toVendorListing(record);
      assert.equal(listing.diet, "Veg");
    });

    it("derives 'Non-Veg' when all visible items are non-vegetarian", () => {
      const record: LiveVendorRecord = {
        id: "VEN-TEST2",
        business: "Kebab Point",
        city: "Lucknow",
        state: "Uttar Pradesh",
        cuisines: ["Mughlai"],
        priceFrom: 850,
        image: "/img/kebab.jpg",
        rating: 4.7,
        reviews: 15,
        verified: true,
        menu: [
          {
            categoryId: "starters",
            perPlate: 90,
            items: [
              { name: "Chicken Tikka", diet: "non-veg" },
              { name: "Mutton Boti", diet: "non-veg" },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listing = toVendorListing(record);
      assert.equal(listing.diet, "Non-Veg");
    });

    it("derives 'Veg & Non-Veg' when menu contains both diets", () => {
      const record: LiveVendorRecord = {
        id: "VEN-TEST3",
        business: "Grand Awadh",
        city: "Lucknow",
        state: "Uttar Pradesh",
        cuisines: ["North Indian", "Mughlai"],
        priceFrom: 1100,
        image: "/img/grand.jpg",
        rating: 4.9,
        reviews: 50,
        verified: true,
        menu: [
          {
            categoryId: "starters",
            perPlate: 80,
            items: [
              { name: "Paneer Tikka", diet: "veg" },
              { name: "Chicken Tikka", diet: "non-veg" },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listing = toVendorListing(record);
      assert.equal(listing.diet, "Veg & Non-Veg");
    });

    it("factors in genuine live counter food extras with diet declarations", () => {
      const record: LiveVendorRecord = {
        id: "VEN-TEST4",
        business: "Chaat & Live Grills",
        city: "Lucknow",
        state: "Uttar Pradesh",
        cuisines: ["Chaat", "Continental"],
        priceFrom: 600,
        image: "/img/chaat.jpg",
        rating: 4.6,
        reviews: 30,
        verified: true,
        menu: [
          {
            categoryId: "starters",
            perPlate: 50,
            items: [{ name: "Pani Puri", diet: "veg" }],
          },
        ],
        counters: [
          {
            id: "live",
            extras: [
              { name: "Grilled Chicken Skewers", diet: "non-veg" },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listing = toVendorListing(record);
      assert.equal(listing.diet, "Veg & Non-Veg");
    });
  });
});
