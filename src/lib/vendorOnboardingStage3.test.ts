/**
 * Tests for Vendor Registration Gateway & Onboarding Steps 1–3 (Stage 3):
 * - Registration gateway identity transitions & duplicate prevention
 * - Step 1: Dietary offering mandatory validation, service cities, identity preservation
 * - Step 2: KYC validation and badge application security rules
 * - Step 3: Service category persistence and custom offerings integrity
 *
 * Run with `npx tsx --test src/lib/vendorOnboardingStage3.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanBadges,
  cleanCateringCategories,
  cleanCustomOfferings,
  cleanDietaryOffering,
  cleanServiceCities,
  validateVendorMenuInput,
  type LiveVendorRecord,
  type RecognitionBadgeKey,
  type VendorBadgesState,
  type VendorCustomOffering,
  type VendorDietaryOffering,
} from "@/lib/vendorMenus";
import { isValidGst } from "@/lib/validate";
import {
  accountsFor,
  effectiveRole,
  newUserId,
  type UserRecord,
} from "@/lib/users";

/* ── 1. Registration Gateway: Identity & Role Transition ────────────────── */

test("registration gateway: signed-out visitor creates fresh vendor account with vendor role", () => {
  const userId = newUserId();
  const vendorUser: UserRecord = {
    id: userId,
    email: "chef.kabir@example.com",
    name: "Master Chef Kabir",
    role: "vendor",
    passwordHash: "scrypt$mockhash",
    createdAt: new Date().toISOString(),
  };

  assert.equal(effectiveRole(vendorUser), "vendor");
  assert.deepEqual(accountsFor(vendorUser), ["vendor"]);
  assert.equal(vendorUser.email, "chef.kabir@example.com");
  assert.equal(vendorUser.name, "Master Chef Kabir");
});

test("registration gateway: existing customer user identity is reused and upgraded without duplicate ID", () => {
  const existingUserId = newUserId();
  const customerUser: UserRecord = {
    id: existingUserId,
    email: "priya.customer@example.com",
    name: "Priya Sharma",
    role: "customer",
    passwordHash: "scrypt$mockhash",
    createdAt: new Date().toISOString(),
  };

  assert.equal(effectiveRole(customerUser), "customer");

  // Upgrade customer user to vendor
  const upgradedUser: UserRecord = {
    ...customerUser,
    role: "vendor",
    accounts: ["vendor"],
  };

  // User ID and email remain identical — no duplicate user created
  assert.equal(upgradedUser.id, existingUserId);
  assert.equal(upgradedUser.email, "priya.customer@example.com");
  assert.equal(upgradedUser.name, "Priya Sharma");
  assert.equal(effectiveRole(upgradedUser), "vendor");
  assert.deepEqual(accountsFor(upgradedUser), ["vendor"]);
});

test("registration gateway: existing vendor identity is preserved and not duplicated", () => {
  const vendorId = "VND-EXISTING-123";
  const ownerUserId = "USR-OWNER-789";

  const liveVendor: LiveVendorRecord = {
    id: vendorId,
    ownerUserId,
    ownerEmail: "owner@awadhfeasts.com",
    business: "Awadh Feasts & Banquets",
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["Awadhi", "Mughlai"],
    image: "/test.jpg",
    rating: 4.8,
    reviews: 120,
    verified: true,
    priceFrom: 1100,
    menu: [],
    dietaryOffering: "both",
    serviceCities: ["Lucknow", "Kanpur"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(liveVendor.id, vendorId);
  assert.equal(liveVendor.ownerUserId, ownerUserId);
  assert.equal(liveVendor.business, "Awadh Feasts & Banquets");
});

/* ── 2. Step 1: Identity & Operations ───────────────────────────────────── */

test("step 1: dietary offering is strictly validated and mandatory", () => {
  // Valid offerings
  assert.equal(cleanDietaryOffering("veg"), "veg");
  assert.equal(cleanDietaryOffering("non-veg"), "non-veg");
  assert.equal(cleanDietaryOffering("both"), "both");
  assert.equal(cleanDietaryOffering(" VEG "), "veg");

  // Invalid / missing offerings are rejected
  assert.equal(cleanDietaryOffering("pescatarian"), undefined);
  assert.equal(cleanDietaryOffering("vegan"), undefined);
  assert.equal(cleanDietaryOffering(""), undefined);
  assert.equal(cleanDietaryOffering(undefined), undefined);
  assert.equal(cleanDietaryOffering(null), undefined);
});

test("step 1: service cities are deduplicated, trimmed, and capped", () => {
  const rawCities = ["Lucknow", "lucknow", "  Kanpur  ", "Varanasi", "", "Lucknow"];
  const cleaned = cleanServiceCities(rawCities);

  assert.deepEqual(cleaned, ["Lucknow", "Kanpur", "Varanasi"]);
  assert.equal(cleaned.length, 3);
});

test("step 1: full payload passes validation and preserves user data", () => {
  const step1Payload = {
    business: "Grand Awadh Caterers",
    city: "Lucknow",
    state: "Uttar Pradesh",
    priceFrom: 850,
    menu: [],
    serviceCities: ["Lucknow", "Kanpur", "Ayodhya"],
    cuisines: ["Mughlai", "Awadhi", "North Indian"],
    dietaryOffering: "both" as VendorDietaryOffering,
    googleRating: 4.9,
    googleReviews: 420,
  };

  const validation = validateVendorMenuInput(step1Payload);
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  assert.equal(validation.value.business, "Grand Awadh Caterers");
  assert.equal(validation.value.dietaryOffering, "both");
  assert.deepEqual(validation.value.serviceCities, ["Lucknow", "Kanpur", "Ayodhya"]);
  assert.deepEqual(validation.value.cuisines, ["Mughlai", "Awadhi", "North Indian"]);
  assert.equal(validation.value.googleRating, 4.9);
  assert.equal(validation.value.googleReviews, 420);
});

/* ── 3. Step 2: KYC & Compliance ────────────────────────────────────────── */

test("step 2: GSTIN validation accepts valid 15-char formats and rejects malformed numbers", () => {
  // Valid GSTINs
  assert.equal(isValidGst("09AAACH7409R1ZZ"), true);
  assert.equal(isValidGst("27AABCU9603R1ZM"), true);

  // Invalid GSTINs
  assert.equal(isValidGst("09AAACH7409R1Z"), false); // 14 chars
  assert.equal(isValidGst("09AAACH7409R1ZZZ"), false); // 16 chars
  assert.equal(isValidGst("INVALID-GSTIN"), false);
  assert.equal(isValidGst(""), false);
});

test("step 2: badge application preserves granted badges and rejects vendor self-granting", () => {
  const initialState: VendorBadgesState = {
    applied: ["verified"],
    granted: [],
    applications: [
      { badgeKey: "verified", appliedAt: new Date().toISOString(), status: "applied" },
    ],
  };

  // Vendor applies for "heritage"
  const newKey: RecognitionBadgeKey = "heritage";
  const updatedState: VendorBadgesState = {
    applied: [...initialState.applied, newKey],
    // Vendor action MUST NOT modify granted
    granted: initialState.granted,
    applications: [
      ...(initialState.applications ?? []),
      { badgeKey: newKey, appliedAt: new Date().toISOString(), status: "applied" },
    ],
  };

  assert.deepEqual(updatedState.applied, ["verified", "heritage"]);
  assert.deepEqual(updatedState.granted, []); // Never auto-granted
  assert.equal(updatedState.applications?.length, 2);
  assert.equal(updatedState.applications?.[1].status, "applied");

  // Normalization via cleanBadges
  const cleaned = cleanBadges(updatedState);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.applied, ["verified", "heritage"]);
  assert.deepEqual(cleaned.granted, []);
});

/* ── 4. Step 3: Service Offerings & Custom Stations ─────────────────────── */

test("step 3: primary service categories persist and are validated", () => {
  const rawCategories = ["full-catering", "single-stall", "baina-box", "unknown-service"];
  const cleaned = cleanCateringCategories(rawCategories);

  // Allowed categories are kept, unknown categories are dropped
  assert.deepEqual(cleaned, ["full-catering", "single-stall", "baina-box"]);
});

test("step 3: custom offerings persist with valid IDs, titles, and blurbs", () => {
  const customList: VendorCustomOffering[] = [
    {
      id: "cust-1",
      title: "Signature Galawati Live Counter",
      blurb: "Slow-smoked on charcoal sigri with saffron sheermal.",
      icon: "🍢",
    },
    {
      id: "cust-2",
      title: "Heirloom Paan Station",
      blurb: "Artisanal meetha and banarasi paan curated live.",
      icon: "🍃",
    },
  ];

  const cleaned = cleanCustomOfferings(customList);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].id, "cust-1");
  assert.equal(cleaned[0].title, "Signature Galawati Live Counter");
  assert.equal(cleaned[1].title, "Heirloom Paan Station");
  assert.equal(cleaned[1].icon, "🍃");
});

test("step 3: custom offerings sanitizer drops empty entries and handles invalid shapes", () => {
  const malformed = [
    { id: "c1", title: "", blurb: "" }, // empty title & blurb -> dropped
    { id: "c2", title: "Valid Counter", blurb: "Freshly prepared" },
    null,
    "not-an-object",
  ];

  const cleaned = cleanCustomOfferings(malformed);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].title, "Valid Counter");
  assert.equal(cleaned[0].blurb, "Freshly prepared");
});
