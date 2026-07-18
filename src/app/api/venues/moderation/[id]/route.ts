import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import type { VenueRecord, VenueStatus } from "@/lib/venues";

export const dynamic = "force-dynamic";

const store = createStore<VenueRecord>({ table: "venues", idField: "id" });

const STATUSES: VenueStatus[] = ["Pending", "Approved", "Hidden"];

// PATCH /api/venues/moderation/[id] → { status?, verified? } — moderate an
// owner-registered venue. `verified` records that an admin has reviewed and
// confirmed the venue's details; `status` is the publish lifecycle ("Approved"
// lists it on the catalogue, detail page and booking flow; "Pending"/"Hidden"
// keep it off every customer surface). A venue can only be published once
// verified — the review-then-publish pipeline is enforced here, not just in the
// admin UI.
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

  const hasStatus = "status" in body;
  const hasVerified = "verified" in body;
  if (!hasStatus && !hasVerified) {
    return Response.json(
      { error: "Nothing to update." },
      { status: 400 },
    );
  }
  if (hasStatus && !STATUSES.includes(body.status as VenueStatus)) {
    return Response.json({ error: "Unknown status." }, { status: 400 });
  }
  if (hasVerified && typeof body.verified !== "boolean") {
    return Response.json({ error: "Invalid verified flag." }, { status: 400 });
  }

  try {
    const record = await store.get(id);
    if (!record || record.deleted) {
      return Response.json({ error: "Venue not found." }, { status: 404 });
    }

    // Legacy records (no prior status) predate verification and are treated as
    // already verified so nothing already live is gated.
    const currentlyVerified = record.verified ?? record.status === undefined;
    const nextVerified = hasVerified
      ? (body.verified as boolean)
      : currentlyVerified;
    const nextStatus = hasStatus
      ? (body.status as VenueStatus)
      : record.status;

    // The publish gate: a venue can't go live until its details are verified.
    if (nextStatus === "Approved" && !nextVerified) {
      return Response.json(
        { error: "Verify the venue's details before publishing." },
        { status: 409 },
      );
    }

    await store.upsert({
      ...record,
      ...(hasStatus ? { status: body.status as VenueStatus } : null),
      ...(hasVerified ? { verified: body.verified as boolean } : null),
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to moderate venue", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
