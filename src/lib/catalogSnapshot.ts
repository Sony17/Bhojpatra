/**
 * Server-side snapshot of what `/api/menu` + `/api/vendors` return, for pages
 * that render vendor/stall data — so they paint the real roster on the first
 * frame instead of an empty or fixture state that swaps a second later, and the
 * client skips those two fetches entirely.
 *
 * `cache()` dedupes within one request (both payloads share the same
 * `assembleMenuCategories()` read). Returns null if the DB is unavailable; the
 * client hooks then fetch as before.
 */
import { cache } from "react";
import { vendorListings } from "@/lib/data";
import {
  assembleMenuCategories,
  listLiveVendorListings,
  seedStallsHidden,
} from "@/lib/vendorMenus";
import { collectStalls, stallBriefsFor } from "@/lib/vendorStorefront";
import type { VendorsPayload } from "@/lib/useAllVendors";
import type { MenuCategory } from "@/lib/data";

export interface CatalogSnapshot {
  /** `/api/menu` → categories */
  categories: MenuCategory[];
  /** `/api/vendors` payload */
  vendors: VendorsPayload;
}

export const loadCatalogSnapshot = cache(
  async (): Promise<CatalogSnapshot | null> => {
    try {
      const [vendors, categories, samplesHidden] = await Promise.all([
        listLiveVendorListings(),
        assembleMenuCategories(),
        seedStallsHidden(),
      ]);
      const stalls = stallBriefsFor(
        [...(samplesHidden ? [] : vendorListings), ...vendors],
        collectStalls(categories),
      );
      return { categories, vendors: { vendors, stalls, samplesHidden } };
    } catch (err) {
      console.error("Failed to load catalog snapshot", err);
      return null;
    }
  },
);
