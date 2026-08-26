import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { refundRazorpayPayment } from "@/lib/razorpay";
import {
  STORED_PAYMENT_STATUSES,
  type StoredPayment,
  type StoredPaymentStatus,
} from "../route";
import type { StoredOrder } from "../../bookings/route";

export const dynamic = "force-dynamic";

const store = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
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
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const isAdmin = guard.role === "admin";

  const { id } = await ctx.params;
  const payment = await store.get(decodeURIComponent(id));
  if (!payment) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
  }

  // Admins may access any payment ledger entry.
  if (isAdmin) {
    return Response.json({ payment });
  }

  // Non-admin: determine ownership through the payment's associated booking.
  const order = payment.bookingId
    ? await bookingStore.get(payment.bookingId)
    : null;

  if (!order || !order.userId || order.userId !== guard.id) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  return Response.json({ payment });
}

// PATCH /api/payments/[id] → { status } — settle / mark pending / refund.
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

  return Response.json({ payment: next });
}
