import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { StoredReview } from "../../../reviews/route";

export const dynamic = "force-dynamic";

const store = createStore<StoredReview>({ table: "reviews", idField: "id" });

// PATCH /api/admin/reviews/[id] → hide a review from the site (or restore it).
// `hidden` is the only mutable field; the review itself is left untouched so the
// action is fully reversible. Admin only.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.hidden !== "boolean") {
    return Response.json(
      { error: "`hidden` must be true or false." },
      { status: 400 },
    );
  }

  const targetId = decodeURIComponent(id);
  const record = await store.get(targetId);
  if (!record) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  // Force `id` to the table key: legacy rows have no `id` in their blob, so
  // without this the upsert would key off `undefined` and create a duplicate
  // instead of updating the row in place.
  const next: StoredReview = { ...record, id: targetId, hidden: body.hidden };
  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update review", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ review: next });
}
