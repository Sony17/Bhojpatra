"use client";

import { useEffect, useMemo, useState } from "react";
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
 * Pass `refreshToken` (increment on pull-to-refresh) to re-fetch live vendors.
 */
export function useAllVendors(refreshToken = 0): VendorListing[] {
  const [liveVendors, setLiveVendors] = useState<VendorListing[]>([]);
  const [stalls, setStalls] = useState<Record<string, StallBrief | null> | null>(
    null,
  );
  const [samplesHidden, setSamplesHidden] = useState<boolean | null>(null);

  useEffect(() => {
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
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  return useMemo(() => {
    const withStall = (v: VendorListing): VendorListing =>
      stalls ? { ...v, stall: stalls[v.id] ?? null } : v;
    const samples = samplesHidden === false ? vendorListings : [];
    return [...liveVendors, ...samples].map(withStall);
  }, [liveVendors, stalls, samplesHidden]);
}
