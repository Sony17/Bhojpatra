// Recording of gateway-verified payments into the shared payments store.
// Called by BOTH the checkout verify route (the fast path, right after the
// customer pays) and the Razorpay webhook (the safety net if the customer's
// tab dies before verify lands) — idempotent on the Razorpay order id, so
// whichever arrives first wins and the other is a no-op.

import { createStore } from "@/lib/store";
import { sendPaymentAlert } from "@/lib/email";
import { refundRazorpayPayment } from "@/lib/razorpay";
import type { StoredPayment } from "@/app/api/payments/route";
import type { StoredOrder } from "@/app/api/bookings/route";

const store = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

export async function recordRazorpayPayment(opts: {
  bookingId: string;
  amountRupees: number;
  orderId: string;
  paymentId: string;
  customer?: string;
}): Promise<StoredPayment> {
  const payments = await store.list();

  const existing = payments.find((p) => p.txnRef === opts.orderId);
  if (existing) return existing;

  const booking = await bookingStore.get(opts.bookingId);
  const isBalancePayment = Boolean(booking && (booking.paid ?? 0) > 0);

  const payment: StoredPayment = {
    // The id IS the order id, so even when verify and the webhook race past
    // the txnRef check above simultaneously, both upserts land on the same
    // primary key — one row, never a duplicate (unlike a counter-derived id).
    id: `PMT-${opts.orderId.replace(/^order_/, "R")}`,
    bookingId: opts.bookingId,
    customer: opts.customer?.trim() || booking?.customer || "Online Booking",
    method: "Razorpay",
    type: "Advance",
    amount: Math.round(opts.amountRupees),
    vpa: "razorpay",
    txnRef: opts.orderId,
    customerTxnId: opts.paymentId,
    razorpayOrderId: opts.orderId,
    razorpayPaymentId: opts.paymentId,
    status: isBalancePayment ? "Settled" : "Advance Received",
    createdAt: new Date().toISOString(),
  };

  await store.upsert(payment);

  // If the booking exists in the database (e.g. paying remaining balance on an
  // existing booking or a webhook capture on an existing record), update its
  // verified payment state atomically.
  if (booking) {
    const currentPaid = booking.paid ?? 0;
    const addedAmount = Math.round(opts.amountRupees);
    const newPaid = Math.min(booking.amount, currentPaid + addedAmount);
    const newStatus =
      booking.status === "Pending" && newPaid >= booking.amount
        ? "Confirmed"
        : booking.status === "Pending"
          ? "Confirmed"
          : booking.status;

    await bookingStore.upsert({
      ...booking,
      paid: newPaid,
      paymentMethod: "Razorpay",
      paymentRef: opts.paymentId,
      status: newStatus,
    });
  }

  // New payment recorded — alert the owners (best-effort; never blocks).
  await sendPaymentAlert(payment);

  return payment;
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
