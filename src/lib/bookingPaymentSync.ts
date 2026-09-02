// Payment → booking reconciliation, server-side. The payments ledger is the
// authority on money received; this pushes what the ledger holds for a booking
// back onto the booking row itself (paid amount, method, gateway ref, status).
//
// Why it exists: the booking wizard writes `paid` onto the order via its own
// POST /api/bookings right after checkout — but that's a CLIENT step. When the
// payment lands against a booking that already exists (a "Connect"/Baina Box
// order paid later), or the customer's tab dies and only the webhook records
// the money, nothing used to update the booking — it sat at paid ₹0 while the
// ledger filled up, and customers paid again. Every path that records a
// payment now calls this, so the booking can never drift from the ledger.

import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { StoredPayment } from "@/app/api/payments/route";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});
const paymentStore = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

/** Ledger rows that count as money actually received for a booking (refunded
 *  and merely-pending rows don't). Newest last, matching insertion order. */
export async function receivedPayments(
  bookingId: string,
): Promise<StoredPayment[]> {
  return (await paymentStore.list()).filter(
    (p) =>
      p.bookingId === bookingId &&
      (p.status === "Advance Received" || p.status === "Settled"),
  );
}

/**
 * Mirror the ledger onto the booking row, if the booking exists yet (in the
 * wizard flow payment precedes the booking POST — a missing booking is simply
 * not our moment; the wizard's own confirm carries the paid amount).
 *
 *  • `paid` becomes the ledger total, capped at the booking amount and never
 *    decreased — an EMI balance settled via PATCH (which writes no ledger row)
 *    must not be un-recorded by a later sync.
 *  • A Pending (EMI) booking flips to Confirmed only once fully paid — the
 *    same transition the customer's own "Pay Balance" performs.
 *  • `paymentMethod` / `paymentRef` are stamped when the caller passes them
 *    (the gateway path), so the order reflects how the money really arrived.
 *
 * Callers treat this as best-effort: the ledger row is already safe, so a
 * sync failure must not fail the payment — wrap in try/catch and log.
 */
export async function syncBookingWithLedger(
  bookingId: string,
  opts?: { method?: StoredOrder["paymentMethod"]; paymentRef?: string },
): Promise<void> {
  const booking = await bookingStore.get(bookingId);
  if (!booking) return;

  const recorded = (await receivedPayments(bookingId)).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const paid = Math.max(
    booking.paid ?? 0,
    Math.min(Math.round(booking.amount), recorded),
  );
  const status =
    booking.status === "Pending" && paid >= booking.amount
      ? "Confirmed"
      : booking.status;

  const next: StoredOrder = {
    ...booking,
    paid,
    status,
    ...(opts?.method && recorded > 0 ? { paymentMethod: opts.method } : {}),
    ...(opts?.paymentRef ? { paymentRef: opts.paymentRef } : {}),
  };

  const changed =
    next.paid !== booking.paid ||
    next.status !== booking.status ||
    next.paymentMethod !== booking.paymentMethod ||
    next.paymentRef !== booking.paymentRef;
  if (changed) await bookingStore.upsert(next);
}
