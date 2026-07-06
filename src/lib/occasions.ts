"use client";

import { useEffect, useState } from "react";
import { occasions } from "@/lib/data";

/**
 * Occasions shown in the Hero + booking pickers.
 *
 * The canonical list lives in the admin-managed `occasions` settings singleton
 * (`/api/admin/occasions`). The seed `occasions` from `@/lib/data` (mapped down
 * to id/name/nameHi — the pickers don't need the icon/image) is the fallback so
 * the pickers keep working before the admin customises anything, or offline.
 */
export type OccasionOption = { id: string; name: string; nameHi: string };

/** Sentinel id for the free-text "Other" choice — the customer types their own
 *  occasion when it isn't in the list. */
export const OTHER_OCCASION_ID = "other";

/** Seed list used until the admin-configured list loads. */
export const DEFAULT_OCCASIONS: OccasionOption[] = occasions.map((o) => ({
  id: o.id,
  name: o.name,
  nameHi: o.nameHi,
}));

/** Slug an admin-entered occasion name into a stable, url-safe id. */
export function slugifyOccasion(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let cache: OccasionOption[] | null = null;

/**
 * Client hook returning the live occasion list. Starts from the seed list, then
 * swaps in the admin-configured list once fetched (cached across mounts so the
 * bar doesn't flash on every navigation).
 */
export function useOccasions(): OccasionOption[] {
  const [list, setList] = useState<OccasionOption[]>(
    cache ?? DEFAULT_OCCASIONS,
  );

  useEffect(() => {
    let active = true;
    fetch("/api/admin/occasions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { occasions?: OccasionOption[] } | null) => {
        const next = d?.occasions;
        if (active && Array.isArray(next) && next.length) {
          cache = next;
          setList(next);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return list;
}
