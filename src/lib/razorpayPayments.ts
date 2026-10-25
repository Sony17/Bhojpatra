// Recording of gateway-verified payments into the shared payments store.
// Called by BOTH the checkout verify route (the fast path, right after the
// customer pays) and the Razorpay webhook (the safety net if the customer's
// tab dies before verify lands) — idempotent on the Razorpay order id, so
// whichever arrives first wins and the other is a no-op.

import { createStore } from "@/lib/store";
import { sendPaymentAlert, sendRefundFailedAlert } from "@/lib/email";
import { refundRazorpayPayment } from "@/lib/razorpay";
import { syncBookingWithLedger } from "@/lib/bookingPaymentSync";
import type { StoredPayment } from "@/app/api/payments/route";
import { store as refundStore, type GatewayRefundLeg } from "@/lib/refunds";

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

/** What's still refundable on a ledger row, in rupees. */
const refundableOn = (p: StoredPayment) => Math.max(0, p.amount - (p.refundedAmount ?? 0));

/** The booking's captured Razorpay payments with money left to refund,
 *  largest first. A partly refunded row stays a candidate for the rest. */
async function gatewayRefundCandidates(bookingId: string): Promise<StoredPayment[]> {
  const payments = await store.list();
  return payments
    .filter(
      (p) =>
        p.bookingId === bookingId &&
        p.method === "Razorpay" &&
        p.razorpayPaymentId &&
        (p.status === "Advance Received" ||
          p.status === "Settled" ||
          p.status === "Refunded") &&
        refundableOn(p) > 0,
    )
    .sort((a, b) => refundableOn(b) - refundableOn(a));
}

/** Rupees of this booking that can go back through Razorpay — across every
 *  captured payment, net of what was already refunded. The rest of a refund
 *  has to be paid out by hand. */
export async function gatewayRefundCoverage(bookingId: string): Promise<number> {
  return (await gatewayRefundCandidates(bookingId)).reduce(
    (sum, p) => sum + refundableOn(p),
    0,
  );
}

/** Execute Razorpay refunds for `amountRupees` of a booking, spread across
 *  its captured payments (largest first), marking each ledger row Refunded.
 *  Never throws: returns the refunds that went through plus Razorpay's error
 *  if one was refused part-way, so the caller can record what moved and
 *  report what didn't. The caller caps the amount at the coverage. */
export async function refundBookingGatewayPayment(
  bookingId: string,
  amountRupees: number,
): Promise<{ legs: GatewayRefundLeg[]; error?: string }> {
  const legs: GatewayRefundLeg[] = [];
  let remaining = Math.round(amountRupees);
  for (const row of await gatewayRefundCandidates(bookingId)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, refundableOn(row));
    let refund;
    try {
      refund = await refundRazorpayPayment(row.razorpayPaymentId!, take * 100);
    } catch (err) {
      return {
        legs,
        error: err instanceof Error && err.message ? err.message : "unknown error",
      };
    }
    await store.upsert({
      ...row,
      status: "Refunded",
      ...(row.status !== "Refunded" ? { statusBeforeRefund: row.status } : {}),
      razorpayRefundId: row.razorpayRefundId ?? refund.id,
      refundedAmount: (row.refundedAmount ?? 0) + take,
    });
    legs.push({
      id: refund.id,
      paymentId: row.razorpayPaymentId!,
      amount: take,
      status: refund.status === "processed" ? "processed" : "pending",
    });
    remaining -= take;
  }
  return { legs };
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

  // The refund request that executed this refund: that leg has now landed.
  await markRefundLeg(opts.refundId, "processed");

  return { bookingId: row.bookingId };
}

/** Flip one gateway leg's status on the refund request that issued it.
 *  Returns the updated request (or null when no request issued this refund,
 *  e.g. one made straight from the Razorpay dashboard). */
async function markRefundLeg(
  refundId: string,
  status: GatewayRefundLeg["status"],
  failureReason?: string,
) {
  const requests = await refundStore.list();
  const request = requests.find(
    (r) => r.gatewayRefunds?.some((l) => l.id === refundId) || r.gatewayRefundId === refundId,
  );
  if (!request) return null;
  const legs = request.gatewayRefunds ?? [];
  const leg = legs.find((l) => l.id === refundId);
  if (leg?.status === status) return request;
  const next = {
    ...request,
    gatewayRefunds: legs.map((l) => (l.id === refundId ? { ...l, status } : l)),
  };
  // A failed leg means the customer did NOT get that money: reopen the
  // request so the team retries or pays it by hand.
  if (status === "failed" && next.status === "Processed") {
    next.status = "Approved";
    next.processedAt = undefined;
    next.gatewayFailure = `Razorpay refund ${refundId} failed${failureReason ? `: ${failureReason}` : ""}. Retry, or pay the customer by hand and record the UTR.`;
  }
  await refundStore.upsert(next);
  return next;
}

/** A refund Razorpay could not complete (refund.failed webhook): give the
 *  money back to the ledger row and reopen the refund request. Idempotent —
 *  a redelivery finds the leg already failed. */
export async function applyRazorpayRefundFailure(opts: {
  refundId: string;
  paymentId: string;
  /** Paise of the failed refund. */
  amountPaise: number;
  reason?: string;
}): Promise<{ bookingId: string } | null> {
  const requests = await refundStore.list();
  const alreadyFailed = requests.some((r) =>
    r.gatewayRefunds?.some((l) => l.id === opts.refundId && l.status === "failed"),
  );

  const payments = await store.list();
  const row = payments.find(
    (p) => p.razorpayPaymentId === opts.paymentId && p.status !== "Failed",
  );
  if (row && !alreadyFailed) {
    const refunded = Math.max(0, (row.refundedAmount ?? 0) - Math.round(opts.amountPaise / 100));
    await store.upsert({
      ...row,
      status: refunded > 0 ? "Refunded" : row.statusBeforeRefund ?? "Advance Received",
      refundedAmount: refunded > 0 ? refunded : undefined,
      razorpayRefundId: row.razorpayRefundId === opts.refundId ? undefined : row.razorpayRefundId,
    });
  }

  const request = await markRefundLeg(opts.refundId, "failed", opts.reason);
  if (request && !alreadyFailed) await sendRefundFailedAlert(request);
  const bookingId = row?.bookingId ?? request?.bookingId;
  return bookingId ? { bookingId } : null;
}
