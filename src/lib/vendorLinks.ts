import {
  vendorListings,
  menuCategories,
  listingCateringCategories,
  isLiveStallCategory,
  type VendorListing,
} from "@/lib/data";
import { BAINA_BOX_VENDOR_DATA } from "@/lib/bainaBoxData";

export type VendorFlowType = "baina" | "live" | "stall";

/**
 * Resolves which booking flow a vendor belongs to based on category and listings:
 * - `"baina"` -> Baina box order panel (/baina-box/<slug>#baina-order)
 * - `"live"` -> Dedicated Live Stall wizard (/book/live-stall?vendor=<id>)
 * - `"stall"` -> Single Stall wizard (/book/stall?vendor=<id>)
 */
export function resolveVendorFlow(vendorId: string): VendorFlowType {
  if (!vendorId) return "stall";
  const normId = vendorId.trim().toLowerCase();

  // 1. Check curated Baina Box vendor data by ID or slug
  if (
    normId in BAINA_BOX_VENDOR_DATA ||
    Object.values(BAINA_BOX_VENDOR_DATA).some(
      (b) => b.vendorId.toLowerCase() === normId || b.slug.toLowerCase() === normId,
    )
  ) {
    return "baina";
  }

  // 2. Check vendor listings
  const listing = vendorListings.find(
    (v) => v.id.toLowerCase() === normId || v.name.toLowerCase() === normId,
  );
  if (listing) {
    const cats = listingCateringCategories(listing);
    if (cats.includes("baina-box")) return "baina";
    const isLive = cats.includes("live-stall") || cats.includes("live-counters");
    const isFull = cats.includes("full-catering");
    // Dedicated live specialists without full-catering coverage route to live-stall
    if (isLive && !isFull) return "live";
  }

  // 3. Check menu categories (for course-level vendor IDs like ls-chaat, ls-dosa, etc.)
  for (const cat of menuCategories) {
    if (cat.vendors.some((v) => v.id.toLowerCase() === normId)) {
      if (isLiveStallCategory(cat.id)) return "live";
    }
  }

  return "stall";
}

/**
 * Constructs the canonical booking destination URL for a vendor, preserving
 * the vendor ID, city, and routing to the appropriate flow.
 */
export function vendorBookingHref(
  vendor: {
    id: string;
    name?: string;
    city?: string;
    cuisines?: string[];
    mealTypes?: string[];
    serviceCategories?: string[];
  },
  cityId?: string,
): string {
  const flow = resolveVendorFlow(vendor.id);
  const cityParam = cityId ? `&city=${encodeURIComponent(cityId)}` : "";
  if (flow === "baina") {
    const baina = Object.values(BAINA_BOX_VENDOR_DATA).find(
      (b) =>
        b.vendorId.toLowerCase() === vendor.id.toLowerCase() ||
        b.slug.toLowerCase() === vendor.id.toLowerCase(),
    );
    return baina
      ? `/baina-box/${baina.slug}#baina-order`
      : `/vendors/${encodeURIComponent(vendor.id)}#baina-order`;
  }
  if (flow === "live") {
    return `/book/live-stall?vendor=${encodeURIComponent(vendor.id)}${cityParam}`;
  }
  return `/book/stall?vendor=${encodeURIComponent(vendor.id)}${cityParam}`;
}
