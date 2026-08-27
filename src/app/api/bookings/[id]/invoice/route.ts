import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { verifyInvoiceSignature } from "@/lib/invoiceSign";
import { bookingInvoice } from "@/lib/bookings";
import type { StoredOrder } from "../../route";

export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

/**
 * GET /api/bookings/[id]/invoice?sig=...
 *
 * Retrieves the authoritative, server-verified invoice for a booking.
 * Access is permitted if:
 * 1. The caller provides a valid HMAC signature matching the booking ID (`sig` query param), OR
 * 2. The caller is signed in as an admin, OR
 * 3. The caller is signed in as the customer who owns this booking.
 *
 * Rejects unsigned or tampered requests with 403 Forbidden.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return Response.json({ error: "Missing booking ID." }, { status: 400 });
  }

  const order = await bookingStore.get(id);
  if (!order) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const sig = url.searchParams.get("sig") ?? "";

  // 1. Check HMAC signature (for public share links)
  const hasValidSig = verifyInvoiceSignature(id, sig);

  // 2. Check session (for owner or admin)
  let hasValidSession = false;
  const guard = await requireRole();
  if (!(guard instanceof Response)) {
    if (guard.role === "admin" || (order.userId && order.userId === guard.id)) {
      hasValidSession = true;
    }
  }

  if (!hasValidSig && !hasValidSession) {
    return Response.json(
      { error: "Unauthorized access to invoice." },
      { status: 403 },
    );
  }

  // Use authoritative order invoice, pinned to authoritative order.amount and order.paid
  const authoritativeInvoice = order.invoice
    ? {
        ...order.invoice,
        id: order.id,
        grandTotal: order.amount,
        paid: order.paid,
      }
    : bookingInvoice({
        ...order,
        receipt: order.receipt ?? "",
      } as Parameters<typeof bookingInvoice>[0]);

  return Response.json({ ok: true, invoice: authoritativeInvoice });
}
