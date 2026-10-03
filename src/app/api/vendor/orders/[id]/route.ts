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
 * Vendor actions: accept (alias acknowledge) and decline. Records the vendor's
 * response only — never changes the booking's payment-driven `status`.
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

    // Accept / decline are recorded as the vendor's response; `status` is left
    // alone because Pending vs Confirmed tracks payment (balance due vs paid).
    const open = order.status === "Pending" || order.status === "Confirmed";
    if (action === "accept" || action === "acknowledge") {
      if (!open || order.vendorDeclined) {
        return Response.json(
          { error: `This booking can no longer be accepted.` },
          { status: 409 },
        );
      }
      next.vendorAcknowledged = true;
      next.acknowledgedAt = order.acknowledgedAt ?? now;
      if (typeof body.notes === "string" && body.notes.trim()) {
        next.vendorNotes = body.notes.trim().slice(0, 500);
      }
    } else if (action === "decline") {
      if (!open || order.vendorAcknowledged || order.vendorDeclined) {
        return Response.json(
          {
            error: order.vendorAcknowledged
              ? "You've already accepted this booking — contact Bhojpatra support to cancel."
              : "This booking can no longer be declined.",
          },
          { status: 409 },
        );
      }
      next.vendorDeclined = true;
      next.declinedAt = now;
      if (typeof body.reason === "string" && body.reason.trim()) {
        next.vendorNotes = body.reason.trim().slice(0, 500);
      }
    } else {
      return Response.json(
        { error: "Invalid action. Supported actions are: 'accept', 'decline'." },
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
