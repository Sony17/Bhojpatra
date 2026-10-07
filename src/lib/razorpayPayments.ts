// Recording of gateway-verified payments into the shared payments store.
// Called by BOTH the checkout verify route (the fast path, right after the
// customer pays) and the Razorpay webhook (the safety net if the customer's
// tab dies before verify lands) — idempotent on the Razorpay order id, so
// whichever arrives first wins and the other is a no-op.

import { createStore } from "@/lib/store";
import { sendPaymentAlert } from "@/lib/email";
import { refundRazorpayPayment } from "@/lib/razorpay";
import { syncBookingWithLedger } from "@/lib/bookingPaymentSync";
import type { StoredPayment } from "@/app/api/payments/route";
import { store as refundStore, displayDate } from "@/lib/refunds";

const store = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

export async function recordRazorpayPayment(opts: {
  bookingId: string;
  amountRupees: number;
  orderId: string;
  paymentId: string;
  /** The payer's account, from the order's server-set notes. */
  userId?: string;
  customer?: string;
}): Promise<StoredPayment> {
  const payments = await store.list();

  // A "Failed" attempt on the same order is history, not a recorded payment —
  // it must never make the later successful capture look already-recorded.
  const existing = payments.find(
    (p) => p.txnRef === opts.orderId && p.status !== "Failed",
  );
  if (existing) {
    // Already recorded (verify and webhook race, or a webhook redelivery) —
    // still re-sync the booking: the first record may have landed before the
    // booking row existed, and this replay is the chance to heal it.
    await syncBooking(opts.bookingId, existing.razorpayPaymentId);
    return existing;
  }

  const payment: StoredPayment = {
    // The id IS the order id, so even when verify and the webhook race past
    // the txnRef check above simultaneously, both upserts land on the same
    // primary key — one row, never a duplicate (unlike a counter-derived id).
    id: `PMT-${opts.orderId.replace(/^order_/, "R")}`,
    bookingId: opts.bookingId,
    ...(opts.userId ? { userId: opts.userId } : {}),
    customer: opts.customer?.trim() || "Online Booking",
    method: "Razorpay",
    type: "Advance",
    amount: Math.round(opts.amountRupees),
    vpa: "razorpay",
    txnRef: opts.orderId,
    customerTxnId: opts.paymentId,
    razorpayOrderId: opts.orderId,
    razorpayPaymentId: opts.paymentId,
    status: "Advance Received",
    createdAt: new Date().toISOString(),
  };

  await store.upsert(payment);

  // The money is in the ledger — now mirror it onto the booking row itself
  // (paid / method / ref, Pending → Confirmed when settled) so an order that
  // already exists never shows unpaid after a real gateway payment.
  await syncBooking(opts.bookingId, opts.paymentId);

  // New payment recorded — alert the owners (best-effort; never blocks).
  await sendPaymentAlert(payment);

  return payment;
}

/** Best-effort booking sync: the ledger row is already safe, so a sync failure
 *  must never fail the verify/webhook response (the customer would be told
 *  their captured payment didn't go through). */
async function syncBooking(
  bookingId: string,
  paymentRef: string | undefined,
): Promise<void> {
  try {
    await syncBookingWithLedger(bookingId, { method: "Razorpay", paymentRef });
  } catch (err) {
    console.error(`Failed to sync booking ${bookingId} after payment`, err);
  }
}

/** Execute a gateway refund for a booking's Razorpay advance and mark the
 *  ledger row Refunded. Returns null when the booking has no refundable
 *  gateway payment (the caller falls back to the manual refund rail); throws
 *  when Razorpay refuses the refund, so the caller must NOT mark anything
 *  processed on that path. */
export async function refundBookingGatewayPayment(
  bookingId: string,
  amountRupees: number,
): Promise<{ refundId: string; paymentRecordId: string } | null> {
  const payments = await store.list();
  const candidates = payments.filter(
    (p) =>
      p.bookingId === bookingId &&
      p.method === "Razorpay" &&
      p.razorpayPaymentId &&
      (p.status === "Advance Received" || p.status === "Settled"),
  );
  if (!candidates.length) return null;

  // Prefer a payment large enough to cover the whole refund; otherwise refund
  // (partially) against the largest one — anything beyond it stays manual.
  const target =
    candidates.find((p) => p.amount >= amountRupees) ??
    candidates.sort((a, b) => b.amount - a.amount)[0];
  const amount = Math.min(Math.round(amountRupees), target.amount);

  const refund = await refundRazorpayPayment(
    target.razorpayPaymentId!,
    amount * 100,
  );

  await store.upsert({
    ...target,
    status: "Refunded",
    razorpayRefundId: refund.id,
  });

  return { refundId: refund.id, paymentRecordId: target.id };
}

/** Record a failed checkout attempt (payment.failed webhook) so it shows in
 *  the admin Payments view with status "Failed". Moves no money: Failed rows
 *  are excluded from every paid-total, and the booking itself is untouched.
 *  Keyed on the Razorpay payment id, so a redelivered event is a no-op, and
 *  `txnRef` holds the payment id (never the order id) so a later successful
 *  attempt on the same order still records normally. */
export async function recordFailedRazorpayPayment(opts: {
  bookingId: string;
  amountRupees: number;
  orderId: string;
  paymentId: string;
  customer?: string;
  reason?: string;
}): Promise<StoredPayment> {
  const id = `PMT-F${opts.paymentId.replace(/^pay_/, "")}`;
  const existing = await store.get(id);
  if (existing) return existing;

  const row: StoredPayment = {
    id,
    bookingId: opts.bookingId,
    customer: opts.customer?.trim() || "Online Booking",
    method: "Razorpay",
    type: "Advance",
    amount: Math.round(opts.amountRupees),
    vpa: "razorpay",
    txnRef: opts.paymentId,
    customerTxnId: opts.paymentId,
    razorpayOrderId: opts.orderId,
    razorpayPaymentId: opts.paymentId,
    status: "Failed",
    ...(opts.reason ? { failureReason: opts.reason.slice(0, 300) } : {}),
    createdAt: new Date().toISOString(),
  };
  await store.upsert(row);
  return row;
}

/** Apply a processed refund (refund.processed webhook) to the ledger and to
 *  the matching refund request. Idempotent: the refunded figure comes from
 *  Razorpay's cumulative `amount_refunded`, and statuses only move forward.
 *  Covers refunds issued from the Razorpay dashboard too. Returns false when
 *  no ledger row carries this payment id. */
export async function applyRazorpayRefund(opts: {
  refundId: string;
  paymentId: string;
  /** Paise refunded by this refund. */
  refundAmountPaise: number;
  /** Paise refunded on the payment so far, when the event carries it. */
  totalRefundedPaise?: number;
}): Promise<{ bookingId: string } | null> {
  const payments = await store.list();
  const row = payments.find(
    (p) => p.razorpayPaymentId === opts.paymentId && p.status !== "Failed",
  );
  if (!row) return null;

  const refundedRupees = Math.round(
    (opts.totalRefundedPaise ?? opts.refundAmountPaise) / 100,
  );
  const next: StoredPayment = {
    ...row,
    status: "Refunded",
    razorpayRefundId: row.razorpayRefundId ?? opts.refundId,
    refundedAmount: Math.min(
      row.amount,
      Math.max(row.refundedAmount ?? 0, refundedRupees),
    ),
  };
  if (
    next.status !== row.status ||
    next.razorpayRefundId !== row.razorpayRefundId ||
    next.refundedAmount !== row.refundedAmount
  ) {
    await store.upsert(next);
  }

  // The refund request that executed this refund, if any, is now settled.
  const requests = await refundStore.list();
  const request = requests.find((r) => r.gatewayRefundId === opts.refundId);
  if (request && request.status !== "Processed" && request.status !== "Declined") {
    await refundStore.upsert({
      ...request,
      status: "Processed",
      processedAt: request.processedAt ?? displayDate(new Date()),
    });
  }

  return { bookingId: row.bookingId };
}
