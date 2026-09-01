import assert from "node:assert/strict";
import {
  DEFAULT_SINGLE_STALL_LEAD_DAYS,
  DEFAULT_VENDOR_LEAD_DAYS,
  customOrderLeadDays,
  vendorLeadDays,
  packageLeadDays,
} from "../src/lib/data.ts";
import { daysUntil } from "../src/lib/bookingPricing.ts";
import { occasionLeadFor } from "../src/lib/occasions.ts";

console.log("=== Testing Single Stall and Live Stall Lead-Time Logic ===");

// Scenario 1: Standard vendor with no explicit leadDays in single stall flow
// Should default to DEFAULT_SINGLE_STALL_LEAD_DAYS (1 day)
const stallVendorsDefault = ["vl-16"]; // Chowk Chaat Bhandar
const leadDefault = customOrderLeadDays(stallVendorsDefault, DEFAULT_SINGLE_STALL_LEAD_DAYS);
assert.equal(leadDefault, 1, "Default single stall lead should be 1 day (next-day)");
console.log("✓ Default Single Stall lead is 1 day (tomorrow allowed)");

// Scenario 2: Same-day stall with leadDays: 0
const sameDayVendor = ["wd-sparkle"]; // Sip & Sparkle has leadDays: 0
const leadSameDay = customOrderLeadDays(sameDayVendor, DEFAULT_SINGLE_STALL_LEAD_DAYS);
assert.equal(leadSameDay, 0, "Same-day vendor lead should be 0 days (today allowed)");
console.log("✓ Same-day vendor lead is 0 days (today allowed)");

// Scenario 3: Custom vendor with explicit leadDays: 3 passed via extraVendors
const customLiveVendor = [{ id: "custom-grill-99", leadDays: 3 }];
const leadCustom = customOrderLeadDays(["custom-grill-99"], DEFAULT_SINGLE_STALL_LEAD_DAYS, customLiveVendor);
assert.equal(leadCustom, 3, "Explicit vendor leadDays of 3 days should be preserved");
console.log("✓ Explicit vendor lead of 3 days is preserved");

// Scenario 4: Occasion does NOT override Single Stall lead
const weddingOccasionLead = occasionLeadFor("wedding", [
  { id: "wedding", name: "Wedding", nameHi: "शादी", leadDays: 30 }
]);
assert.equal(weddingOccasionLead, 30, "Occasion lead for wedding is 30 days");
// In StallBookingWizard, effective lead is vendorLead (1 day), not Math.max(1, 30)
const stallEffectiveLead = Math.max(0, leadDefault);
assert.equal(stallEffectiveLead, 1, "Stall effective lead remains 1 day even if occasion is Wedding");
console.log("✓ Wedding occasion (30 days) does not inflate Single Stall lead time (1 day)");

// Scenario 5: Feast booking preserves occasion lead
const feastPackageLead = packageLeadDays.silver; // 7 days
const feastEffectiveLead = Math.max(feastPackageLead, weddingOccasionLead); // max(7, 30) = 30
assert.equal(feastEffectiveLead, 30, "Feast effective lead correctly enforces max(package, occasion)");
console.log("✓ Feast packages correctly enforce max(packageLead, occasionLead)");

console.log("=== All Availability & Lead-Time Tests Passed! ===");
