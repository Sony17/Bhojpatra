"use client";

import { useEffect, useMemo, useState } from "react";
import { vendorListings, type VendorListing } from "@/lib/data";

/**
 * Curated static listings plus live (dashboard-published) vendors from
 * `/api/vendors`. Same merge the catalog uses — compare tray/table must use
 * this so picks of live caterers still resolve into rows.
 *
 * Pass `refreshToken` (increment on pull-to-refresh) to re-fetch live vendors.
 */
export function useAllVendors(refreshToken = 0): VendorListing[] {
  const [liveVendors, setLiveVendors] = useState<VendorListing[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/vendors")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { vendors?: VendorListing[] } | null) => {
        if (alive && d?.vendors) setLiveVendors(d.vendors);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  return useMemo(
    () => [...vendorListings, ...liveVendors],
    [liveVendors],
  );
}
