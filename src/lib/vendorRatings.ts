"use client";

/**
 * Shared client hook for real, customer-submitted vendor ratings.
 *
 * Ratings shown across the app (vendor catalogue, booking-wizard vendor cards,
 * specialists, admin) start from static seed numbers in `data.ts`. This hook
 * layers the *real* aggregated ratings from `/api/reviews/summary` on top, so any
 * surface can show a "verified" line without each re-implementing the fetch.
 *
 * Two lookup maps come back because vendor surfaces don't share an id scheme:
 *  - `byId`   — keyed by the booking-wizard catalogue vendor id.
 *  - `byName` — keyed by a slug of the vendor name (bridges every other surface).
 * `statFor()` tries the id first, then falls back to the name bridge.
 */
import { useEffect, useState } from "react";
import { slugifyName } from "@/lib/bookings";

/** Average rating (1 decimal) + number of real reviews for one vendor. */
export interface VendorRatingSummary {
  rating: number;
  count: number;
}

export interface VendorRatings {
  byId: Record<string, VendorRatingSummary>;
  byName: Record<string, VendorRatingSummary>;
}

const EMPTY: VendorRatings = { byId: {}, byName: {} };

/**
 * Fetch the per-vendor rating aggregates once on mount. Best-effort: returns
 * empty maps until loaded and on any failure, so callers simply fall back to the
 * seed rating.
 */
export function useVendorRatings(): VendorRatings {
  const [ratings, setRatings] = useState<VendorRatings>(EMPTY);
  useEffect(() => {
    let live = true;
    fetch("/api/reviews/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Partial<VendorRatings> | null) => {
        if (live && d) {
          setRatings({ byId: d.byId ?? {}, byName: d.byName ?? {} });
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return ratings;
}

/**
 * The real rating for a vendor, preferring an exact catalogue-id match and
 * falling back to the name bridge. `undefined` when the vendor has no real
 * reviews yet — callers then show only the seed rating.
 */
export function statFor(
  ratings: VendorRatings,
  vendor: { id?: string; name: string },
): VendorRatingSummary | undefined {
  if (vendor.id && ratings.byId[vendor.id]) return ratings.byId[vendor.id];
  return ratings.byName[slugifyName(vendor.name)];
}
