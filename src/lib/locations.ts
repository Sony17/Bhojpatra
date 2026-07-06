"use client";

import { useEffect, useState } from "react";
import { cities } from "@/lib/data";

/**
 * Serviceable locations (cities / states) shown in the Hero + booking pickers.
 *
 * The canonical list lives in the admin-managed `locations` settings singleton
 * (`/api/admin/locations`). `cities` from `@/lib/data` is the seed/fallback used
 * before the admin has customised anything (or when the DB is unreachable), so
 * every consumer keeps working offline.
 */
export type LocationOption = { id: string; name: string; nameHi: string };

/** Sentinel id for the free-text "Other" choice — the customer types their own
 *  city/state when their location isn't in the list. */
export const OTHER_LOCATION_ID = "other";

/** Seed list used until the admin-configured list loads. */
export const DEFAULT_LOCATIONS: LocationOption[] = cities;

/** Slug an admin-entered location name into a stable, url-safe id. */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let cache: LocationOption[] | null = null;

/**
 * Client hook returning the live location list. Starts from the seed list, then
 * swaps in the admin-configured list once fetched (cached across mounts so the
 * bar doesn't flash on every navigation).
 */
export function useLocations(): LocationOption[] {
  const [locations, setLocations] = useState<LocationOption[]>(
    cache ?? DEFAULT_LOCATIONS,
  );

  useEffect(() => {
    let active = true;
    fetch("/api/admin/locations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { locations?: LocationOption[] } | null) => {
        const list = d?.locations;
        if (active && Array.isArray(list) && list.length) {
          cache = list;
          setLocations(list);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return locations;
}
