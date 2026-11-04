"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/** Server snapshot for every vendor hook below it (catalog, compare tray…),
 *  so a page wraps once instead of threading `initial` through components. */
const VendorsSeedContext = createContext<VendorsPayload | null>(null);

export function VendorsSeed({
  initial,
  children,
}: {
  initial: VendorsPayload | null | undefined;
  children: ReactNode;
}) {
  return createElement(
    VendorsSeedContext.Provider,
    { value: initial ?? null },
    children,
  );
}

/** `useAllVendors` plus whether `/api/vendors` has answered yet — so a page
 *  can show a loading state instead of a premature "no vendors" message. */
export function useAllVendorsStatus(
  refreshToken = 0,
  explicitInitial?: VendorsPayload | null,
): {
  vendors: VendorListing[];
  loaded: boolean;
  /** Live `/api/vendors` failed and no server snapshot had real roster data. */
  rosterFailed: boolean;
} {
  const seed = useContext(VendorsSeedContext);
  const initial = explicitInitial ?? seed;
  const [liveVendors, setLiveVendors] = useState<VendorListing[]>(
    initial?.vendors ?? [],
  );
  const [stalls, setStalls] = useState<Record<string, StallBrief | null> | null>(
    initial?.stalls ?? null,
  );
  const [samplesHidden, setSamplesHidden] = useState<boolean | null>(
    initial ? initial.samplesHidden : null,
  );
  const [liveFetchFailed, setLiveFetchFailed] = useState(false);
  const hadLiveRoster = useRef(Boolean(initial?.vendors?.length));
  // Server-provided roster → no initial fetch (only an explicit refresh).
  const seeded = useRef(!!initial);

  useEffect(() => {
    if (seeded.current && refreshToken === 0) return;
    let alive = true;
    setLiveFetchFailed(false);
    fetch("/api/vendors")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(
        (
          d: {
            vendors?: VendorListing[];
            stalls?: Record<string, StallBrief | null>;
            samplesHidden?: boolean;
          },
        ) => {
          if (!alive) return;
          if (d?.vendors) {
            setLiveVendors(d.vendors);
            hadLiveRoster.current = d.vendors.length > 0;
          }
          if (d?.stalls) setStalls(d.stalls);
          setSamplesHidden(Boolean(d.samplesHidden));
          setLiveFetchFailed(false);
        },
      )
      .catch(() => {
        // Offline — stop "loading" so the page can settle on what it has.
        if (alive) {
          setSamplesHidden((prev) => prev ?? false);
          setLiveFetchFailed(true);
        }
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
  const rosterFailed = liveFetchFailed && !hadLiveRoster.current;
  return { vendors, loaded: samplesHidden !== null, rosterFailed };
}
