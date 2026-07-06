import path from "path";
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { BookingStatus } from "@/lib/data";
import type { StoredOrder } from "../route";

export const dynamic = "force-dynamic";

const store = createStore<StoredOrder>({
  table: "bookings",
  file: path.join(process.cwd(), "data", "bookings.json"),
  idField: "id",
});

// Allowed status transitions. Terminal states (Completed, Cancelled) can't move
// on; anything can be cancelled. Same-status updates are idempotent.
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  Pending: ["Confirmed", "Cancelled", "Pending"],
  Confirmed: ["Completed", "Cancelled", "Confirmed"],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"],
};

function isBookingStatus(v: unknown): v is BookingStatus {
  return (
    v === "Pending" || v === "Confirmed" || v === "Completed" || v === "Cancelled"
  );
}

// GET /api/bookings/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const order = await store.get(decodeURIComponent(id));
  if (!order) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  return Response.json({ order });
}

// PATCH /api/bookings/[id] → { status?, paid? } — validated status transition
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

  const order = await store.get(decodeURIComponent(id));
  if (!order) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  const next: StoredOrder = { ...order };

  if (body.status !== undefined) {
    if (!isBookingStatus(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    if (!TRANSITIONS[order.status].includes(body.status)) {
      return Response.json(
        { error: `Cannot move a ${order.status} booking to ${body.status}.` },
        { status: 409 },
      );
    }
    next.status = body.status;
  }

  if (body.paid !== undefined) {
    const paid = Number(body.paid);
    if (!Number.isFinite(paid) || paid < 0) {
      return Response.json({ error: "Invalid paid amount." }, { status: 400 });
    }
    next.paid = Math.round(paid);
  }

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update booking", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ order: next });
}

// DELETE /api/bookings/[id] → soft-cancel (financial records are never removed)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const order = await store.get(decodeURIComponent(id));
  if (!order) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if (order.status !== "Cancelled") {
    await store.upsert({ ...order, status: "Cancelled" });
  }
  return Response.json({ ok: true, status: "Cancelled" });
}
