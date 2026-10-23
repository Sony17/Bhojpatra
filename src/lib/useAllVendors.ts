"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { vendorListings, type VendorListing } from "@/lib/data";
import type { StallBrief } from "@/lib/vendorStorefront";

/**
 * Real (live, approved) vendors from `/api/vendors` followed by the curated
 * sample listings — real businesses always lead. Same merge the catalog uses —
 * compare tray/table must use this so picks of live caterers still resolve
 * into rows. The sample listings are only merged once the API confirms the
 * admin hasn't hidden the platform's demo vendors (`samplesHidden`), so a
 * launched catalog never flashes them.
 *
 * Each listing also gets its `stall` (which Single Stall its "Book" sells, and
 * at what per-plate price) once the API answers: `undefined` until then,
 * `null` when the vendor has no bookable stall.
 *
 * Pass `refreshToken` (increment on pull-to-refresh) to re-fetch live vendors,
 * and `initial` (server snapshot) to paint the roster on the first frame.
 */
export function useAllVendors(
  refreshToken = 0,
  initial?: VendorsPayload | null,
): VendorListing[] {
  return useAllVendorsStatus(refreshToken, initial).vendors;
}

/** The `/api/vendors` payload — also produced server-side (catalogSnapshot)
 *  and passed in as `initial` so the first paint already has the roster. */
export interface VendorsPayload {
  vendors: VendorListing[];
  stalls: Record<string, StallBrief | null>;
  samplesHidden: boolean;
}

/** `useAllVendors` plus whether `/api/vendors` has answered yet — so a page
 *  can show a loading state instead of a premature "no vendors" message. */
export function useAllVendorsStatus(
  refreshToken = 0,
  initial?: VendorsPayload | null,
): {
  vendors: VendorListing[];
  loaded: boolean;
} {
  const [liveVendors, setLiveVendors] = useState<VendorListing[]>(
    initial?.vendors ?? [],
  );
  const [stalls, setStalls] = useState<Record<string, StallBrief | null> | null>(
    initial?.stalls ?? null,
  );
  const [samplesHidden, setSamplesHidden] = useState<boolean | null>(
    initial ? initial.samplesHidden : null,
  );
  // Server-provided roster → no initial fetch (only an explicit refresh).
  const seeded = useRef(!!initial);

  useEffect(() => {
    if (seeded.current && refreshToken === 0) return;
    let alive = true;
    fetch("/api/vendors")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            vendors?: VendorListing[];
            stalls?: Record<string, StallBrief | null>;
            samplesHidden?: boolean;
          } | null,
        ) => {
          if (!alive) return;
          if (d?.vendors) setLiveVendors(d.vendors);
          if (d?.stalls) setStalls(d.stalls);
          if (d) setSamplesHidden(Boolean(d.samplesHidden));
        },
      )
      .catch(() => {
        // Offline — stop "loading" so the page can settle on what it has.
        if (alive) setSamplesHidden((prev) => prev ?? false);
      });
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  const vendors = useMemo(() => {
    const withStall = (v: VendorListing): VendorListing =>
      stalls ? { ...v, stall: stalls[v.id] ?? null } : v;
    const samples = samplesHidden === false ? vendorListings : [];
    return [...liveVendors, ...samples].map(withStall);
  }, [liveVendors, stalls, samplesHidden]);
  return { vendors, loaded: samplesHidden !== null };
}
