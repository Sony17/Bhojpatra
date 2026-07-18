import { requireRole } from "@/lib/auth";
import {
  store,
  toAdminRefund,
  displayDate,
  isRefundStatus,
  canTransition,
} from "@/lib/refunds";

export const dynamic = "force-dynamic";

// GET /api/refunds/[id] — admin fetch of a single refund request.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const refund = await store.get(decodeURIComponent(id));
  if (!refund) {
    return Response.json({ error: "Refund not found." }, { status: 404 });
  }
  return Response.json({ refund: toAdminRefund(refund) });
}

// PATCH /api/refunds/[id] → { status, adminNote? } — admin advances a refund
// through its lifecycle (Requested → Approved → Processed, or Declined). Only
// valid transitions are accepted; reaching a terminal state stamps `processedAt`.
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

  const refund = await store.get(decodeURIComponent(id));
  if (!refund) {
    return Response.json({ error: "Refund not found." }, { status: 404 });
  }

  const next = { ...refund };

  if (body.status !== undefined) {
    if (!isRefundStatus(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    if (!canTransition(refund.status, body.status)) {
      return Response.json(
        { error: `Cannot move a ${refund.status} refund to ${body.status}.` },
        { status: 409 },
      );
    }
    next.status = body.status;
    // Stamp the terminal date once, when the refund first settles.
    if (
      (body.status === "Processed" || body.status === "Declined") &&
      !next.processedAt
    ) {
      next.processedAt = displayDate(new Date());
    }
  }

  if (typeof body.adminNote === "string") {
    next.adminNote = body.adminNote.trim().slice(0, 1000) || undefined;
  }

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update refund", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, refund: toAdminRefund(next) });
}
