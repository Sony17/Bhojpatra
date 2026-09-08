import { listingCateringCategories, type VendorListing } from "@/lib/data";

/**
 * Known food/catering category IDs in Bhojpatra.
 * Essential services and pure decor have no food catering offerings.
 */
const FOOD_CATERING_CATEGORIES = new Set([
  "full-catering",
  "single-stall",
  "live-stall",
  "baina-box",
  "hi-tea",
]);

/**
 * Authoritative check for whether a vendor represents a genuine food or catering offering.
 *
 * Rules based on Bhojpatra's domain architecture:
 * 1. Has meal courses declared/derived (mealTypes.length > 0) -> true.
 * 2. Has food catering categories (full-catering, single-stall, live-stall, baina-box, hi-tea) -> true.
 * 3. Clearly non-food / service-only specialists (such as decor-only vendors with no meal courses or food categories) -> false.
 */
export function isFoodVendor(vendor: VendorListing): boolean {
  if (vendor.mealTypes && vendor.mealTypes.length > 0) {
    return true;
  }

  const categories = listingCateringCategories(vendor);
  if (categories.some((cat) => FOOD_CATERING_CATEGORIES.has(cat))) {
    return true;
  }

  // Non-food / decor / service-only specialist
  return false;
}
