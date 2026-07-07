import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import type { VenueRecord, VenueStatus } from "@/lib/venues";

export const dynamic = "force-dynamic";

const store = createStore<VenueRecord>({ table: "venues", idField: "id" });

const STATUSES: VenueStatus[] = ["Pending", "Approved", "Hidden"];

// PATCH /api/venues/moderation/[id] → { status } — set an owner-registered
// venue's approval status. "Approved" lists it on the catalogue, detail page and
// booking flow; "Pending"/"Hidden" keep it off every customer surface.
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
  const status = body.status;
  if (!STATUSES.includes(status as VenueStatus)) {
    return Response.json({ error: "Unknown status." }, { status: 400 });
  }

  try {
    const record = await store.get(id);
    if (!record || record.deleted) {
      return Response.json({ error: "Venue not found." }, { status: 404 });
    }
    await store.upsert({ ...record, status: status as VenueStatus });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to set venue status", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
