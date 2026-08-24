// Recording of gateway-verified payments into the shared payments store.
// Called by BOTH the checkout verify route (the fast path, right after the
// customer pays) and the Razorpay webhook (the safety net if the customer's
// tab dies before verify lands) — idempotent on the Razorpay order id, so
// whichever arrives first wins and the other is a no-op.

import { createStore } from "@/lib/store";
import { sendPaymentAlert } from "@/lib/email";
import type { StoredPayment } from "@/app/api/payments/route";

const store = createStore<StoredPayment>({
  table: "payments",
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

  const payment: StoredPayment = {
    // The id IS the order id, so even when verify and the webhook race past
    // the txnRef check above simultaneously, both upserts land on the same
    // primary key — one row, never a duplicate (unlike a counter-derived id).
    id: `PMT-${opts.orderId.replace(/^order_/, "R")}`,
    bookingId: opts.bookingId,
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

  // New payment recorded — alert the owners (best-effort; never blocks).
  await sendPaymentAlert(payment);

  return payment;
}
