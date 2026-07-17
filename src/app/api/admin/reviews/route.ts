import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { StoredReview } from "../../reviews/route";

export const dynamic = "force-dynamic";

// Same `reviews` table the public feed writes to — read here with hidden ones
// included so an admin can moderate (and restore) them.
const store = createStore<StoredReview>({ table: "reviews", idField: "id" });

// GET /api/admin/reviews → every customer review, newest first, including the
// ones hidden from the public site. Admin only.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  // Legacy whole-order reviews predate the composite `id` and were keyed by
  // bookingId alone, so their stored blob has no `id`. Backfill it from the
  // bookingId (which is their table key) so every row is addressable for
  // hide/restore.
  const reviews = (await store.list()).map((r) => ({
    ...r,
    id: r.id ?? r.bookingId,
  }));
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ reviews });
}
