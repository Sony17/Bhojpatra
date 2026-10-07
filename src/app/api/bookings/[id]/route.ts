import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { BookingStatus } from "@/lib/data";
import type { InvoiceData } from "@/lib/invoice";
import type { BookedVendor, BookingVendorReview } from "@/lib/bookings";
import type { StoredOrder } from "../route";
import { bookingStatusFor } from "@/lib/bookingRules";

export const dynamic = "force-dynamic";

const store = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

// Allowed status transitions for an admin. A completed booking can be reopened
// back to Confirmed; only Cancelled is terminal. Same-status updates are
// idempotent.
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  Pending: ["Confirmed", "Cancelled", "Pending"],
  Confirmed: ["Completed", "Cancelled", "Confirmed"],
  Completed: ["Completed", "Confirmed"],
  Cancelled: ["Cancelled"],
};

// What a booking's own customer may do to it from My Bookings: cancel a
// pending or confirmed order, mark a confirmed event complete, or reopen a
// completed one. They can NEVER confirm a booking — Pending → Confirmed happens
// only when the payments ledger holds the advance (bookingPaymentSync), so a
// customer pays (My Bookings → Pay) rather than flipping a status. A cancelled
// order is terminal.
const CUSTOMER_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  Pending: ["Cancelled"],
  Confirmed: ["Completed", "Cancelled"],
  Completed: ["Confirmed"],
  Cancelled: [],
};

// The only content a customer may change after booking: their notes and their
// review of the vendors. Guests, date, vendors, invoice and money are fixed
// once the order is placed (they were priced and paid against); changes go
// through the team.
const CUSTOMER_FIELDS = new Set(["status", "note", "reopened", "reviews", "review"]);

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
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const order = await store.get(decodeURIComponent(id));
  // Someone else's booking reads as missing, so ids can't be probed.
  if (!order || (guard.role !== "admin" && order.userId !== guard.id)) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  return Response.json({ order });
}

// PATCH /api/bookings/[id] → { status?, paid?, …content } — validated status
// transition. Admins may run any transition, adjust `paid` and edit the order;
// a booking's own customer may only cancel / complete / reopen (see
// CUSTOMER_TRANSITIONS) and edit their notes + review (CUSTOMER_FIELDS).
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const isAdmin = guard.role === "admin";
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

  // A customer may only act on a booking they own; admins on any booking.
  // Legacy orders with no recorded owner stay admin-only.
  if (!isAdmin && (!order.userId || order.userId !== guard.id)) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  if (!isAdmin) {
    const forbidden = Object.keys(body).filter((k) => !CUSTOMER_FIELDS.has(k));
    if (forbidden.length) {
      return Response.json(
        {
          error:
            "These booking details can't be changed online — please contact us to change them.",
        },
        { status: 403 },
      );
    }
    // A Completed reopen may only move a booking that really was paid for.
    if (
      body.status === "Confirmed" &&
      order.status === "Completed" &&
      bookingStatusFor(order.amount, order.paid) !== "Confirmed"
    ) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }
  }

  const next: StoredOrder = { ...order };

  if (body.status !== undefined) {
    if (!isBookingStatus(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    const allowed = isAdmin
      ? TRANSITIONS[order.status]
      : CUSTOMER_TRANSITIONS[order.status];
    if (!allowed.includes(body.status)) {
      return Response.json(
        { error: `Cannot move a ${order.status} booking to ${body.status}.` },
        { status: 409 },
      );
    }
    next.status = body.status;
  }

  if (body.paid !== undefined) {
    // Only the team settles money — a customer can't move the paid amount.
    if (!isAdmin) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }
    const paid = Number(body.paid);
    if (!Number.isFinite(paid) || paid < 0) {
      return Response.json({ error: "Invalid paid amount." }, { status: 400 });
    }
    next.paid = Math.round(paid);
  }

  // Content fields. The logistics / invoice / vendors are admin-only (the
  // customer whitelist above already refused them); notes and the per-vendor
  // review mirror are the customer's own. Each is applied only when present.
  if (typeof body.occasion === "string" && body.occasion.trim()) {
    next.occasion = body.occasion.trim();
  }
  if (typeof body.date === "string" && body.date.trim()) {
    next.date = body.date.trim();
  }
  if (typeof body.city === "string") {
    next.city = body.city.trim();
  }
  if (body.guests !== undefined) {
    const guests = Math.round(Number(body.guests));
    if (Number.isFinite(guests) && guests > 0) next.guests = guests;
  }
  if (body.note !== undefined) {
    next.note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 2000)
        : undefined;
  }
  if (body.reopened !== undefined) {
    next.reopened = Boolean(body.reopened);
  }
  if (body.invoice && typeof body.invoice === "object") {
    next.invoice = body.invoice as InvoiceData;
  }
  if (Array.isArray(body.vendors)) {
    next.vendors = body.vendors as BookedVendor[];
  }
  if (Array.isArray(body.reviews)) {
    next.reviews = body.reviews as BookingVendorReview[];
  }
  if (body.review && typeof body.review === "object") {
    next.review = body.review as {
      rating: number;
      comment: string;
      createdAt: string;
    };
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
