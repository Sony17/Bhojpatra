/**
 * Occasions ranked by booked revenue, for the home page's occasion tiles.
 *
 * Public, but returns only the ordered occasion names (lower-cased), never
 * amounts. The ranking changes slowly, so it is cached in memory for an hour
 * and marked cacheable at the edge, which keeps it off the database on most
 * page views.
 */
import { topBookingOccasions } from "@/lib/store";

export const dynamic = "force-dynamic";

const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; occasions: string[] } | null = null;

// GET /api/content/top-occasions → { occasions: string[] } (highest first)
export async function GET() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    try {
      cache = { at: Date.now(), occasions: await topBookingOccasions(10) };
    } catch (err) {
      console.error("Failed to rank occasions", err);
      // No ranking: the page keeps its own order.
      return Response.json({ occasions: [] }, { headers: { "Cache-Control": "no-store" } });
    }
  }
  return Response.json(
    { occasions: cache.occasions },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
