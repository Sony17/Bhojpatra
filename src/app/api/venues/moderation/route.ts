import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import {
  sanitizeVenueImage,
  type VenueRecord,
  type VenueStatus,
} from "@/lib/venues";

export const dynamic = "force-dynamic";

const store = createStore<VenueRecord>({ table: "venues", idField: "id" });

// GET /api/venues/moderation → { venues: [...] }
// Admin review queue: every owner-registered venue (pending and approved alike,
// excluding owner-deleted ones) with its approval status, newest first. Legacy
// records saved before approvals surface as already "Approved".
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  try {
    const venues = (await store.list())
      .filter((v) => !v.deleted)
      .map((v) => ({
        ...v,
        image: sanitizeVenueImage(v.image),
        status: (v.status ?? "Approved") as VenueStatus,
        // Legacy records predate verification; treat them as already verified so
        // nothing already live is retroactively gated behind a review.
        verified: v.verified ?? v.status === undefined,
      }))
      .reverse();
    return Response.json({ venues });
  } catch (err) {
    console.error("Failed to list venues for moderation", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
