// Payment → booking reconciliation, server-side. The payments ledger is the
// authority on money received; this pushes what the ledger holds for a booking
// back onto the booking row itself (paid amount, method, gateway ref, status).
//
// Why it exists: the Single Stall wizard creates its order (Pending, server
// priced) BEFORE taking money, so the payment always lands against a booking
// that already exists — as does a "Connect" order paid later, or a payment
// only the webhook saw because the customer's tab died. Every path that
// records or verifies a payment calls this, so the booking can never drift
// from the ledger, and it's the only place a booking becomes Confirmed.

import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { StoredPayment } from "@/app/api/payments/route";
import { bookingStatusFor } from "@/lib/bookingRules";
import { notifyOrderConfirmed, notifyOrderPlaced } from "@/lib/bookingNotify";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});
const paymentStore = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

/** The booking itself, or undefined when it doesn't exist (yet). */
export async function getBooking(
  bookingId: string,
): Promise<StoredOrder | undefined> {
  return (await bookingStore.get(bookingId)) ?? undefined;
}

/** The account that owns a booking, or undefined when the booking doesn't
 *  exist yet (feast wizard: payment precedes the booking POST) or is legacy. */
export async function bookingOwner(
  bookingId: string,
): Promise<string | undefined> {
  return (await bookingStore.get(bookingId))?.userId;
}

/** A ledger row counts for `ownerId` only when it was paid by that account
 *  (or predates payer tracking). This is what stops customer B's booking that
 *  lands on the same id from being credited with customer A's money. */
function paidBy(p: StoredPayment, ownerId: string | undefined): boolean {
  return !ownerId || !p.userId || p.userId === ownerId;
}

/** Ledger rows that count as money actually received for a booking — refunded,
 *  failed and still-unverified (Pending) rows don't. Pass the booking's owner
 *  to count only that account's payments. Newest last (insertion order). */
export async function receivedPayments(
  bookingId: string,
  ownerId?: string,
): Promise<StoredPayment[]> {
  return (await paymentStore.list()).filter(
    (p) =>
      p.bookingId === bookingId &&
      (p.status === "Advance Received" || p.status === "Settled") &&
      paidBy(p, ownerId),
  );
}

/** Any payment activity on a booking that isn't a failed attempt — received,
 *  awaiting verification, or refunded. Once there is some, the order's price
 *  is frozen (the money was taken against it). */
export async function paymentActivity(
  bookingId: string,
  ownerId?: string,
): Promise<StoredPayment[]> {
  return (await paymentStore.list()).filter(
    (p) =>
      p.bookingId === bookingId && p.status !== "Failed" && paidBy(p, ownerId),
  );
}

/**
 * Mirror the ledger onto the booking row, if the booking exists yet.
 *
 *  • `paid` becomes the ledger total (this owner's verified rows), capped at
 *    the booking amount and never decreased — an admin-entered `paid` must not
 *    be un-recorded by a later sync.
 *  • A Pending booking flips to Confirmed once the advance (10%) is in — the
 *    ONLY way a booking becomes Confirmed (`bookingStatusFor`).
 *  • A checkout-in-progress order (`awaitingPayment`) becomes a real order the
 *    moment money lands, or the customer reports a manual transfer
 *    (`submitted`) — that's when owners, customer and vendor are told.
 *  • `paymentMethod` / `paymentRef` are stamped when the caller passes them
 *    (the gateway path), so the order reflects how the money really arrived.
 *
 * Callers treat this as best-effort: the ledger row is already safe, so a
 * sync failure must not fail the payment — wrap in try/catch and log.
 */
export async function syncBookingWithLedger(
  bookingId: string,
  opts?: {
    method?: StoredOrder["paymentMethod"];
    paymentRef?: string;
    /** A payment (even an unverified one) was just reported for this order. */
    submitted?: boolean;
  },
): Promise<void> {
  const booking = await bookingStore.get(bookingId);
  if (!booking) return;

  const recorded = (await receivedPayments(bookingId, booking.userId)).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const paid = Math.max(
    booking.paid ?? 0,
    Math.min(Math.round(booking.amount), recorded),
  );
  // Only an open Pending order moves; Cancelled / Completed stay put, and a
  // Confirmed order never drops back.
  const status =
    booking.status === "Pending"
      ? bookingStatusFor(booking.amount, paid)
      : booking.status;
  const submitted = Boolean(opts?.submitted) || paid > 0;

  const next: StoredOrder = {
    ...booking,
    paid,
    status,
    ...(opts?.method && recorded > 0 ? { paymentMethod: opts.method } : {}),
    ...(opts?.paymentRef ? { paymentRef: opts.paymentRef } : {}),
  };
  if (booking.awaitingPayment && submitted) delete next.awaitingPayment;

  const changed =
    next.paid !== booking.paid ||
    next.status !== booking.status ||
    next.paymentMethod !== booking.paymentMethod ||
    next.paymentRef !== booking.paymentRef ||
    next.awaitingPayment !== booking.awaitingPayment;
  if (!changed) return;
  await bookingStore.upsert(next);

  if (booking.awaitingPayment && !next.awaitingPayment) {
    // First time anyone hears of this order — its status already says
    // whether it's confirmed, so one announcement covers both.
    await notifyOrderPlaced(next);
  } else if (booking.status === "Pending" && next.status === "Confirmed") {
    await notifyOrderConfirmed(next);
  }
}
