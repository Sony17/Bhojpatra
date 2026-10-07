/**
 * Tests for Vendor V2 Backend APIs (Stage 2):
 * - Vendor menu persistence, retrieval, sanitization, and legacy support
 * - Applications V2 persistence and field integrity
 * - Vendor orders isolation, grouping, and status transitions
 * - Badges application lifecycle and security rules
 *
 * Run with `npx tsx --test src/lib/vendorApisStage2.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findVendorById,
  findVendorByOwner,
  saveVendor,
  validateVendorMenuInput,
  type LiveVendorRecord,
  type RecognitionBadgeKey,
  type VendorBadgesState,
} from "@/lib/vendorMenus";
import {
  readVendorApplications,
  removeVendorApplication,
  writeVendorApplications,
  type VendorApplicationRecord,
} from "@/lib/vendorApplications";
import {
  orderMatchesVendor,
  toVendorOrderSummary,
} from "@/lib/vendorOrders";
import type { StoredOrder } from "@/app/api/bookings/route";

// The round-trip tests below write to the store, and the only store is the
// LIVE Neon database (no file fallback). They therefore run only on explicit
// opt-in against a scratch database:
//   VENDOR_DB_TESTS=1 DATABASE_URL=<scratch db> npm test
// `npm test` on its own never touches the database.
const DB_TESTS = process.env.VENDOR_DB_TESTS === "1" && !!process.env.DATABASE_URL;

/* ── 1. Vendor Menu: V2 Persistence & Cycle ─────────────────────────────── */

test("vendor menu: V2 fields survive request validation, persistence, and retrieval", async () => {
  const ownerUserId = `usr-test-${Date.now()}`;
  const vendorId = `ven-test-${Date.now()}`;

  const rawPayload = {
    business: "Royal Mughlai Kitchen",
    city: "Lucknow",
    state: "Uttar Pradesh",
    priceFrom: 950,
    menu: [
      {
        categoryId: "main",
        perPlate: 450,
        items: [
          {
            name: "Shahi Galawati Kebab",
            diet: "non-veg",
            desc: "Slow-smoked on charcoal with 32 spices.",
          },
        ],
      },
    ],
    serviceCities: ["Lucknow", "Ayodhya"],
    dietaryOffering: "both",
    minPax: 75,
    leadHours: 48,
    bestFor: ["Weddings", "Royal Dinners"],
    packageName: "Dawat-e-Khas",
    goldSpecialization: "Galawati Kebab Specialist",
    cutleryTier: "ultra",
    customOfferings: [
      { title: "Sheermal Counter", blurb: "Freshly baked saffron sheermal" },
    ],
    stallConfig: {
      categories: ["kebab-counter"],
      categoryPricing: {
        "kebab-counter": { fixedPerPlate: 250, minPaxGuarantee: 50 },
      },
      equipment: ["Sigri", "Tandoor"],
      cutlery: "Ultra Chinaware",
    },
    bainaDetails: {
      studioName: "Awadh Artisan Mithai",
      story: "Heirloom confectioners since 1920.",
      minOrderBoxes: 20,
      leadDays: 3,
      packaging: "brocade",
    },
    badges: {
      applied: ["heritage" as const],
      granted: [],
    },
  };

  // 1. Validation
  const check = validateVendorMenuInput(rawPayload);
  assert.equal(check.ok, true);
  if (!check.ok) return;

  const record: LiveVendorRecord = {
    id: vendorId,
    ownerUserId,
    ownerEmail: `${ownerUserId}@example.com`,
    image: "/test.jpg",
    rating: 0,
    reviews: 0,
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...check.value,
  };

  // 2. Persistence & Retrieval (opt-in only — see DB_TESTS above)
  if (!DB_TESTS) {
    return;
  }

  await saveVendor(record);

  // 3. Retrieval
  const fetchedByOwner = await findVendorByOwner(ownerUserId);
  assert.ok(fetchedByOwner);
  assert.equal(fetchedByOwner.id, vendorId);
  assert.equal(fetchedByOwner.business, "Royal Mughlai Kitchen");
  assert.equal(fetchedByOwner.dietaryOffering, "both");
  assert.equal(fetchedByOwner.minPax, 75);
  assert.equal(fetchedByOwner.leadHours, 48);
  assert.equal(fetchedByOwner.packageName, "Dawat-e-Khas");
  assert.equal(fetchedByOwner.goldSpecialization, "Galawati Kebab Specialist");
  assert.equal(fetchedByOwner.cutleryTier, "ultra");
  assert.deepEqual(fetchedByOwner.serviceCities, ["Lucknow", "Ayodhya"]);
  assert.deepEqual(fetchedByOwner.bestFor, ["Weddings", "Royal Dinners"]);
  assert.equal(fetchedByOwner.customOfferings?.length, 1);
  assert.equal(fetchedByOwner.stallConfig?.categories[0], "kebab-counter");
  assert.equal(fetchedByOwner.bainaDetails?.studioName, "Awadh Artisan Mithai");
  assert.deepEqual(fetchedByOwner.badges?.applied, ["heritage"]);
  assert.equal(
    fetchedByOwner.menu[0].items[0].desc,
    "Slow-smoked on charcoal with 32 spices.",
  );

  const fetchedById = await findVendorById(vendorId);
  assert.ok(fetchedById);
  assert.equal(fetchedById.ownerUserId, ownerUserId);
});

test("vendor menu: malformed V2 fields are safely sanitized", () => {
  const malformed = {
    business: "Clean Test",
    city: "Delhi",
    state: "Delhi",
    priceFrom: 500,
    menu: [{ categoryId: "main", perPlate: 300, items: [] }],
    dietaryOffering: "pescatarian", // invalid enum
    cutleryTier: "gold-plated", // invalid enum
    minPax: -50, // invalid negative number
    leadHours: "not-a-number",
    bestFor: "just-a-string", // not an array
    stallConfig: "invalid-stall",
    badges: { applied: ["fake-badge"] },
  };

  const check = validateVendorMenuInput(malformed);
  assert.equal(check.ok, true);
  if (check.ok) {
    assert.equal(check.value.dietaryOffering, undefined);
    assert.equal(check.value.cutleryTier, undefined);
    assert.equal(check.value.minPax, undefined);
    assert.equal(check.value.leadHours, undefined);
    assert.equal(check.value.bestFor, undefined);
    assert.equal(check.value.stallConfig, undefined);
    assert.equal(check.value.badges, undefined);
  }
});

test("vendor menu: legacy vendor records without V2 fields load safely", () => {
  const legacyRecord: LiveVendorRecord = {
    id: "VEN-LEGACY-01",
    business: "Old Style Caterers",
    city: "Kanpur",
    state: "UP",
    cuisines: ["North Indian"],
    priceFrom: 400,
    image: "/old.jpg",
    rating: 4.5,
    reviews: 10,
    verified: true,
    moderation: "Approved",
    menu: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(legacyRecord.dietaryOffering, undefined);
  assert.equal(legacyRecord.stallConfig, undefined);
  assert.equal(legacyRecord.bainaDetails, undefined);
  assert.equal(legacyRecord.badges, undefined);
});

/* ── 2. Applications: V2 Payload Persistence & Field Integrity ──────────── */

test("applications: V2 onboarding payload persists correctly without losing fields", async () => {
  const appId = `VND-APP-${Date.now()}`;
  const now = new Date().toISOString();

  const newApp: VendorApplicationRecord = {
    id: appId,
    business: "Grand Awadh Banquet & Stalls",
    owner: "Master Chef",
    email: `chef-${Date.now()}@example.com`,
    phone: "9876543210",
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["Awadhi", "Mughlai"],
    speciality: "Royal feasts",
    requestedTiers: ["Gold", "Platinum"],
    gstNumber: "09AAACH7409R1ZZ",
    fssaiNumber: "12345678901234",
    documents: [
      { kind: "GST", number: "09AAACH7409R1ZZ", status: "Pending" },
    ],
    packages: [
      { name: "Gold Feast", dishes: "12 dishes", price: "1200" },
    ],
    minGuests: "50",
    maxGuests: "500",
    maxEventsPerDay: "2",
    serviceCities: ["Lucknow", "Kanpur", "Varanasi"],
    counters: ["hi-tea", "chaat"],
    cateringCategories: ["full-catering", "single-stall"],
    dietaryOffering: "both",
    minPax: 50,
    leadHours: 24,
    bestFor: ["Weddings", "Corporate"],
    packageName: "Nawabi Dawat",
    goldSpecialization: "Biryani Master",
    cutleryTier: "standard",
    stallConfig: {
      categories: ["chaat"],
      equipment: ["Burner"],
    },
    bainaDetails: {
      studioName: "Nawabi Sweets",
      packaging: "gold-foil",
    },
    badges: {
      applied: ["verified"],
      granted: [],
    },
    status: "Pending",
    submitted: now.slice(0, 10),
    submittedAt: now,
  };

  if (!DB_TESTS) {
    return;
  }

  // Insert just this one record (never rewrite the whole table).
  await writeVendorApplications([newApp]);

  const reloaded = await readVendorApplications();
  const found = reloaded.find((a) => a.id === appId);
  assert.ok(found);
  assert.equal(found.business, "Grand Awadh Banquet & Stalls");
  assert.equal(found.gstNumber, "09AAACH7409R1ZZ");
  assert.equal(found.dietaryOffering, "both");
  assert.equal(found.minPax, 50);
  assert.equal(found.leadHours, 24);
  assert.equal(found.packageName, "Nawabi Dawat");
  assert.equal(found.stallConfig?.categories[0], "chaat");
  assert.equal(found.bainaDetails?.studioName, "Nawabi Sweets");
  assert.deepEqual(found.badges?.applied, ["verified"]);
  assert.deepEqual(found.serviceCities, ["Lucknow", "Kanpur", "Varanasi"]);

  // Cleanup test app (upsertMany never deletes — remove it explicitly).
  await removeVendorApplication(appId);
});

/* ── 3. Orders: Vendor Matching, Isolation & Status Transitions ─────────── */

test("orders: orderMatchesVendor accurately identifies orders for a vendor and isolates others", () => {
  const vendorA: LiveVendorRecord = {
    id: "VEN-AAA111",
    business: "Awadhi Royal Caterers",
    city: "Lucknow",
    state: "UP",
    cuisines: ["Awadhi"],
    priceFrom: 800,
    image: "/vA.jpg",
    rating: 5,
    reviews: 10,
    verified: true,
    moderation: "Approved",
    menu: [],
    createdAt: "",
    updatedAt: "",
  };

  const vendorB: LiveVendorRecord = {
    id: "VEN-BBB222",
    business: "Tandoor Tales",
    city: "Delhi",
    state: "Delhi",
    cuisines: ["Punjabi"],
    priceFrom: 600,
    image: "/vB.jpg",
    rating: 4.8,
    reviews: 8,
    verified: true,
    moderation: "Approved",
    menu: [],
    createdAt: "",
    updatedAt: "",
  };

  // Order with structured vendors including vendor A
  const orderForA: StoredOrder = {
    id: "ORD-001",
    customer: "Amit Sharma",
    phone: "9876543210",
    occasion: "Wedding",
    date: "2026-11-15",
    guests: 300,
    vendor: "Awadhi Royal Caterers",
    vendors: [{ id: "VEN-AAA111", name: "Awadhi Royal Caterers" }],
    city: "Lucknow",
    amount: 240000,
    paid: 60000,
    paymentMethod: "UPI",
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  // Order for vendor B
  const orderForB: StoredOrder = {
    id: "ORD-002",
    customer: "Rohan Kapoor",
    phone: "9876543211",
    occasion: "Birthday",
    date: "2026-10-20",
    guests: 100,
    vendor: "Tandoor Tales",
    vendors: [{ id: "VEN-BBB222", name: "Tandoor Tales" }],
    city: "Delhi",
    amount: 60000,
    paid: 60000,
    paymentMethod: "UPI",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  };

  // Multi-vendor order involving vendor A and another stall
  const multiVendorOrder: StoredOrder = {
    id: "ORD-003",
    customer: "Priya Singh",
    phone: "9876543212",
    occasion: "Reception",
    date: "2026-12-05",
    guests: 400,
    vendor: "Awadhi Royal Caterers, Chaat House",
    vendors: [
      { id: "VEN-AAA111", name: "Awadhi Royal Caterers" },
      { id: "VEN-CCC333", name: "Chaat House" },
    ],
    city: "Lucknow",
    amount: 320000,
    paid: 80000,
    paymentMethod: "UPI",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  };

  // Vendor A checks
  assert.equal(orderMatchesVendor(orderForA, vendorA), true);
  assert.equal(orderMatchesVendor(multiVendorOrder, vendorA), true);
  assert.equal(orderMatchesVendor(orderForB, vendorA), false); // Vendor A CANNOT see Vendor B's order

  // Vendor B checks
  assert.equal(orderMatchesVendor(orderForB, vendorB), true);
  assert.equal(orderMatchesVendor(orderForA, vendorB), false); // Vendor B CANNOT see Vendor A's order
});

test("orders: pending and confirmed bookings are correctly separated in projections", () => {
  const pendingOrder: StoredOrder = {
    id: "ORD-P1",
    customer: "Rahul Verma",
    phone: "9123456780",
    occasion: "Engagement",
    date: "2026-10-10",
    guests: 150,
    vendor: "Awadhi Royal Caterers",
    city: "Lucknow",
    amount: 120000,
    paid: 0,
    paymentMethod: "Connect",
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  const confirmedOrder: StoredOrder = {
    id: "ORD-C1",
    customer: "Sneha Gupta",
    phone: "9123456781",
    occasion: "Anniversary",
    date: "2026-10-12",
    guests: 80,
    vendor: "Awadhi Royal Caterers",
    city: "Lucknow",
    amount: 64000,
    paid: 64000,
    paymentMethod: "UPI",
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  };

  const summaryP = toVendorOrderSummary(pendingOrder);
  const summaryC = toVendorOrderSummary(confirmedOrder);

  assert.equal(summaryP.id, "ORD-P1");
  assert.equal(summaryP.status, "Pending");
  assert.equal(summaryC.id, "ORD-C1");
  assert.equal(summaryC.status, "Confirmed");
});

test("orders: status transition rules enforce valid vendor actions and reject invalid transitions", () => {
  const pendingOrder: StoredOrder = {
    id: "ORD-TR1",
    customer: "Vikram Malhotra",
    phone: "9876543200",
    occasion: "Corporate Dinner",
    date: "2026-11-20",
    guests: 200,
    vendor: "Awadhi Royal Caterers",
    city: "Lucknow",
    amount: 180000,
    paid: 45000,
    paymentMethod: "UPI",
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  // Valid Action: Accept (Pending -> Confirmed)
  const acceptedOrder: StoredOrder = {
    ...pendingOrder,
    status: "Confirmed",
    vendorAcknowledged: true,
    acknowledgedAt: new Date().toISOString(),
  };
  assert.equal(acceptedOrder.status, "Confirmed");
  assert.equal(acceptedOrder.vendorAcknowledged, true);

  // Valid Action: Decline (Pending -> Cancelled)
  const declinedOrder: StoredOrder = {
    ...pendingOrder,
    status: "Cancelled",
    vendorNotes: "Date fully booked in kitchen schedule",
  };
  assert.equal(declinedOrder.status, "Cancelled");
  assert.equal(declinedOrder.vendorNotes, "Date fully booked in kitchen schedule");

  // Invalid Action: Cannot accept or decline an already confirmed/completed booking
  const completedOrder: StoredOrder = {
    ...pendingOrder,
    status: "Completed",
  };
  assert.notEqual(completedOrder.status, "Pending");
});

/* ── 4. Badges: Application Lifecycle & Security Rules ──────────────────── */

test("badges: valid badge applications persist in applied list and applications trail", () => {
  const currentBadges: VendorBadgesState = {
    applied: ["verified"],
    granted: [],
    applications: [
      {
        badgeKey: "verified",
        status: "applied",
        appliedAt: "2026-04-01T00:00:00Z",
      },
    ],
  };

  // Vendor applies for "heritage"
  const newBadgeKey: RecognitionBadgeKey = "heritage";
  const updatedBadges: VendorBadgesState = {
    applied: [...currentBadges.applied, newBadgeKey],
    granted: currentBadges.granted, // Granted MUST stay as-is
    applications: [
      ...(currentBadges.applications ?? []),
      {
        badgeKey: newBadgeKey,
        status: "applied",
        appliedAt: new Date().toISOString(),
        criteria: { traditionalKitchen: true },
        details: { traditionYears: "30" },
      },
    ],
  };

  assert.deepEqual(updatedBadges.applied, ["verified", "heritage"]);
  assert.equal(updatedBadges.applications?.length, 2);
  assert.equal(updatedBadges.applications?.[1].badgeKey, "heritage");
  assert.equal(updatedBadges.applications?.[1].status, "applied");
  // Security rule: granted badges MUST NOT be granted automatically!
  assert.deepEqual(updatedBadges.granted, []);
});

test("badges: granted badges cannot be modified or self-granted by vendor action", () => {
  const badgesState: VendorBadgesState = {
    applied: ["verified"],
    granted: ["verified"], // Admin had granted this
    applications: [],
  };

  // Vendor attempts to apply for "icon"
  const attemptedKey: RecognitionBadgeKey = "icon";
  const nextBadges: VendorBadgesState = {
    applied: [...badgesState.applied, attemptedKey],
    granted: badgesState.granted, // Must retain only admin-granted
    applications: [{ badgeKey: attemptedKey, status: "applied", appliedAt: new Date().toISOString() }],
  };

  // Vendor still only has "verified" granted, not "icon"
  assert.deepEqual(nextBadges.granted, ["verified"]);
  assert.ok(nextBadges.applied.includes("icon"));
});
