import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { refundRazorpayPayment } from "@/lib/razorpay";
import { syncBookingWithLedger } from "@/lib/bookingPaymentSync";
import {
  STORED_PAYMENT_STATUSES,
  type StoredPayment,
  type StoredPaymentStatus,
} from "../route";

export const dynamic = "force-dynamic";

const store = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

function isPaymentStatus(v: unknown): v is StoredPaymentStatus {
  return (
    typeof v === "string" &&
    (STORED_PAYMENT_STATUSES as string[]).includes(v)
  );
}

// GET /api/payments/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const payment = await store.get(decodeURIComponent(id));
  if (!payment) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }
  return Response.json({ payment });
}

// PATCH /api/payments/[id] → { status } — verify / settle / mark pending /
// refund. Verifying a manual UPI/QR transfer is Pending → "Advance Received";
// the booking is then re-synced from the ledger, which is what confirms it.
// No DELETE: the payment ledger is immutable.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPaymentStatus(body.status)) {
    return Response.json({ error: "Invalid payment status." }, { status: 400 });
  }

  const payment = await store.get(decodeURIComponent(id));
  if (!payment) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }

  // A failed attempt moved no money — there is nothing to settle or refund.
  if (payment.status === "Failed") {
    return Response.json(
      { error: "A failed payment can't be changed." },
      { status: 409 },
    );
  }

  const next: StoredPayment = { ...payment, status: body.status };

  // Flipping a gateway payment to Refunded moves REAL money — execute the
  // Razorpay refund first and only persist the status if it succeeds. Manual
  // (UPI/QR) payments keep the plain status flip: the team refunds those
  // outside the gateway.
  if (
    body.status === "Refunded" &&
    payment.status !== "Refunded" &&
    payment.method === "Razorpay" &&
    payment.razorpayPaymentId
  ) {
    try {
      const refund = await refundRazorpayPayment(
        payment.razorpayPaymentId,
        payment.amount * 100,
      );
      next.razorpayRefundId = refund.id;
    } catch (err) {
      console.error("Razorpay refund failed", err);
      return Response.json(
        {
          error:
            "Razorpay rejected the refund — nothing was changed. Check the payment on the Razorpay dashboard and try again.",
        },
        { status: 502 },
      );
    }
  }

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update payment", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Mirror the ledger onto the booking (a verified transfer confirms it).
  // Best-effort — the payment row above is already saved.
  try {
    await syncBookingWithLedger(next.bookingId, {
      paymentRef: next.razorpayPaymentId ?? next.customerTxnId,
    });
  } catch (err) {
    console.error(`Failed to sync booking ${next.bookingId} after payment update`, err);
  }

  return Response.json({ payment: next });
}
