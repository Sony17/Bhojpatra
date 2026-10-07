import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import { findVendorByOwner } from "@/lib/vendorMenus";
import type { StoredOrder } from "@/app/api/bookings/route";
import { orderMatchesVendor, toVendorOrderSummary } from "@/lib/vendorOrders";
import { sendVendorDeclinedAlert, sendVendorDeclinedToCustomer } from "@/lib/email";

export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

/**
 * PATCH /api/vendor/orders/[id]
 * Vendor actions: accept (alias acknowledge) and decline. Records the vendor's
 * response only — never changes the booking's payment-driven `status`. Any new
 * order (not yet answered, not cancelled/completed) can be accepted or
 * declined whatever its payment state. A decline needs a reason; it emails the
 * customer and the owners, and shows in the admin Bookings console ("Declined
 * by vendor"), where the team cancels and refunds through the usual paths.
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
    if (order.awaitingPayment || !orderMatchesVendor(order, vendor)) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const next: StoredOrder = { ...order };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";

    // Accept / decline are recorded as the vendor's response; `status` is left
    // alone because Pending vs Confirmed tracks payment (advance due vs in).
    const open = order.status === "Pending" || order.status === "Confirmed";
    if (action === "accept" || action === "acknowledge") {
      // (An already-accepted order re-accepts idempotently.)
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
      const reason =
        typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
      if (reason.length < 3) {
        return Response.json(
          { error: "Please tell the customer why you're declining." },
          { status: 400 },
        );
      }
      next.vendorDeclined = true;
      next.declinedAt = now;
      next.vendorNotes = reason;
    } else {
      return Response.json(
        { error: "Invalid action. Supported actions are: 'accept', 'decline'." },
        { status: 400 },
      );
    }

    await bookingStore.upsert(next);

    // Decline → tell the customer and the owners. Best-effort: the response is
    // already saved; a mail failure is logged, never surfaced to the vendor.
    if (action === "decline") {
      const reason = next.vendorNotes ?? "";
      const [toCustomer, toOwners] = await Promise.all([
        next.email
          ? sendVendorDeclinedToCustomer(next, next.email, vendor.business, reason)
          : Promise.resolve(false),
        sendVendorDeclinedAlert(next, vendor.business, reason),
      ]);
      if (!toCustomer)
        console.error(`[email] decline notice to customer for ${next.id} was not delivered`);
      if (!toOwners)
        console.error(`[email] decline alert to owners for ${next.id} was not delivered`);
    }

    return Response.json({ ok: true, order: toVendorOrderSummary(next) });
  } catch (err) {
    console.error("Failed to update vendor order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
