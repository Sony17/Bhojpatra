import path from "path";
import { createStore } from "@/lib/store";
import type { StoredReview } from "../route";

// Aggregates are computed from live rows on each request — never cache.
export const dynamic = "force-dynamic";

// Same underlying `reviews` store as the write route (read-only here).
const store = createStore<StoredReview>({
  table: "reviews",
  file: path.join(process.cwd(), "data", "reviews.json"),
  idField: "id",
});

/** Average rating (1 decimal) + count for one vendor. */
export interface VendorRatingSummary {
  rating: number;
  count: number;
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Real customer ratings aggregated per vendor, two ways so both vendor surfaces
 * can look themselves up:
 *  - `byId`   — keyed by catalogue vendor id (the booking-wizard vendor cards).
 *  - `byName` — keyed by a slug of the vendor name (bridges to the /vendors
 *               catalogue listings, which use a different id scheme).
 */
export async function GET() {
  const reviews = await store.list();

  const idSums = new Map<string, { sum: number; count: number }>();
  const nameSums = new Map<string, { sum: number; count: number }>();

  const add = (map: Map<string, { sum: number; count: number }>, key: string, rating: number) => {
    if (!key) return;
    const cur = map.get(key) ?? { sum: 0, count: 0 };
    cur.sum += rating;
    cur.count += 1;
    map.set(key, cur);
  };

  for (const r of reviews) {
    if (typeof r.rating !== "number") continue;
    if (r.vendorId) add(idSums, r.vendorId, r.rating);
    add(nameSums, slug(r.vendor ?? ""), r.rating);
  }

  const finalize = (map: Map<string, { sum: number; count: number }>) => {
    const out: Record<string, VendorRatingSummary> = {};
    for (const [key, { sum, count }] of map) {
      out[key] = { rating: Math.round((sum / count) * 10) / 10, count };
    }
    return out;
  };

  return Response.json({ byId: finalize(idSums), byName: finalize(nameSums) });
}
