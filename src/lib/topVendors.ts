"use client";

import { useEffect, useState } from "react";

/**
 * Admin-curated "Top 5" pins for the /book menu-builder vendor ribbon (client
 * access layer). Mirrors the `homeContent` store pattern: a module-level cache
 * shared across every component instance, loaded once from
 * `/api/content/top-vendors` and notified on every admin save, so each
 * "Push to Top 5" button in Vendor Management shows the live slot at once.
 * The wizard itself never reads this — `/api/menu` applies the pins
 * server-side in `assembleMenuCategories`.
 */
import {
  DEFAULT_TOP_VENDORS,
  TOP_FIVE_COUNT,
  reconcileTopVendors,
  type TopVendorPin,
  type TopVendors,
} from "@/lib/topVendorsData";
import { slugifyName } from "@/lib/bookings";

export * from "@/lib/topVendorsData";

const ENDPOINT = "/api/content/top-vendors";

/* ── Shared client cache (fetch once, notify all subscribers) ─────────────── */

let cache: TopVendors = DEFAULT_TOP_VENDORS;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function ensureLoaded(): void {
  if (loaded || inflight) return;
  inflight = fetch(ENDPOINT, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { topVendors?: Partial<TopVendors> } | null) => {
      if (json?.topVendors) cache = reconcileTopVendors(json.topVendors);
      loaded = true;
      emit();
    })
    .catch(() => {
      /* offline — keep the empty default */
    })
    .finally(() => {
      inflight = null;
    });
}

/** Persist the next pin list (admin) and notify every subscriber. */
async function saveTopVendors(next: TopVendors): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!res.ok) {
    throw new Error("Failed to save the Top 5 list.");
  }
  const json = (await res.json().catch(() => null)) as
    | { topVendors?: Partial<TopVendors> }
    | null;
  cache = json?.topVendors ? reconcileTopVendors(json.topVendors) : next;
  loaded = true;
  emit();
}

/** The freshest stored pins — re-fetched so a push from one admin tab never
 *  clobbers pins saved from another since this tab loaded. */
async function freshPins(): Promise<TopVendors> {
  const fresh = await fetch(ENDPOINT, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { topVendors?: Partial<TopVendors> } | null) =>
      json?.topVendors ? reconcileTopVendors(json.topVendors) : null,
    )
    .catch(() => null);
  return fresh ?? cache;
}

/** Pin a brand into slot #1 of the Top 5 (admin). Replaces any existing pin
 *  for the same brand (by id or name slug); when all five slots are taken the
 *  oldest pin drops off the end. */
export async function pushVendorToTopFive(pin: TopVendorPin): Promise<void> {
  const current = await freshPins();
  const slug = slugifyName(pin.name);
  const rest = current.pins.filter(
    (p) => p.id !== pin.id && slugifyName(p.name) !== slug,
  );
  await saveTopVendors({ pins: [pin, ...rest].slice(0, TOP_FIVE_COUNT) });
}

/** Drop a brand from the Top 5 (admin); later pins move up a slot. */
export async function removeVendorFromTopFive(vendor: {
  id: string;
  name: string;
}): Promise<void> {
  const current = await freshPins();
  const slug = slugifyName(vendor.name);
  await saveTopVendors({
    pins: current.pins.filter(
      (p) => p.id !== vendor.id && slugifyName(p.name) !== slug,
    ),
  });
}

/** Read the live pin list. Re-renders when the API loads or an admin saves. */
export function useTopVendors(): TopVendors {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return cache;
}
