import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import { findVendorByOwner } from "@/lib/vendorMenus";
import type { StoredOrder } from "@/app/api/bookings/route";
import { orderMatchesVendor, toVendorOrderSummary } from "@/lib/vendorOrders";

export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

/**
 * PATCH /api/vendor/orders/[id]
 * Supports vendor actions: acknowledge, accept, decline.
 * Strict cross-vendor authorization prevents modifying another vendor's booking.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  const { id } = await ctx.params;
  const decodedId = decodeURIComponent(id);

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({ error: "Vendor profile not found." }, { status: 404 });
    }

    const order = await bookingStore.get(decodedId);
    if (!order) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    // Cross-vendor isolation: verify this order belongs to the authenticated vendor
    if (!orderMatchesVendor(order, vendor)) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const next: StoredOrder = { ...order };

    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const requestedStatus = typeof body.status === "string" ? body.status.trim() : "";

    if (action === "accept" || requestedStatus === "Confirmed") {
      if (order.status !== "Pending") {
        return Response.json(
          { error: `Cannot accept a booking that is currently ${order.status}.` },
          { status: 409 },
        );
      }
      next.status = "Confirmed";
      next.vendorAcknowledged = true;
      next.acknowledgedAt = now;
    } else if (action === "decline" || requestedStatus === "Cancelled") {
      if (order.status !== "Pending") {
        return Response.json(
          { error: `Cannot decline a booking that is currently ${order.status}.` },
          { status: 409 },
        );
      }
      next.status = "Cancelled";
      if (typeof body.reason === "string" && body.reason.trim()) {
        next.vendorNotes = body.reason.trim().slice(0, 500);
      }
    } else if (action === "acknowledge") {
      if (order.status !== "Pending" && order.status !== "Confirmed") {
        return Response.json(
          { error: `Cannot acknowledge an order with status ${order.status}.` },
          { status: 409 },
        );
      }
      next.vendorAcknowledged = true;
      next.acknowledgedAt = now;
      if (typeof body.notes === "string" && body.notes.trim()) {
        next.vendorNotes = body.notes.trim().slice(0, 500);
      }
    } else {
      return Response.json(
        {
          error:
            "Invalid action. Supported actions are: 'acknowledge', 'accept', 'decline'.",
        },
        { status: 400 },
      );
    }

    await bookingStore.upsert(next);
    return Response.json({ ok: true, order: toVendorOrderSummary(next) });
  } catch (err) {
    console.error("Failed to update vendor order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
