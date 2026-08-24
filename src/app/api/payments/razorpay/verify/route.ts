import { requireRole } from "@/lib/auth";
import {
  captureRazorpayPayment,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import { recordRazorpayPayment } from "@/lib/razorpayPayments";

// Verifies live signatures and writes to Postgres — never prerender or cache.
export const dynamic = "force-dynamic";

// Verify a completed Razorpay Checkout and record the advance. Two independent
// checks before anything is stored: the checkout signature proves the callback
// came from Razorpay, and the payment is re-fetched from Razorpay's API so the
// recorded amount/order come from the gateway — the client's word is never
// trusted for money. Idempotent on the order id (the webhook records the same
// payment if this call never arrives).
export async function POST(request: Request) {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;

  if (!isRazorpayConfigured()) {
    return Response.json(
      { error: "Online payment is not available right now." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, orderId, paymentId, signature, customer } = (body ??
    {}) as Record<string, unknown>;

  if (typeof bookingId !== "string" || !/^BHJ-/.test(bookingId)) {
    return Response.json(
      { error: "Missing booking reference." },
      { status: 400 },
    );
  }
  if (
    typeof orderId !== "string" ||
    !orderId ||
    typeof paymentId !== "string" ||
    !paymentId ||
    typeof signature !== "string" ||
    !signature
  ) {
    return Response.json(
      { error: "Missing payment reference." },
      { status: 400 },
    );
  }

  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    return Response.json(
      { error: "Payment verification failed." },
      { status: 400 },
    );
  }

  try {
    // The signature proves authenticity; the fetch pins amount + status.
    let payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== orderId) {
      return Response.json(
        { error: "Payment verification failed." },
        { status: 400 },
      );
    }
    if (payment.currency && payment.currency !== "INR") {
      return Response.json(
        { error: "Payment verification failed." },
        { status: 400 },
      );
    }
    if (payment.status !== "captured" && payment.status !== "authorized") {
      return Response.json(
        { error: "Payment was not completed." },
        { status: 400 },
      );
    }

    // Orders are created with auto-capture, but if the payment still sits at
    // authorized, capture it now — authorized funds auto-refund if left. A
    // capture failure isn't fatal (funds are reserved; the webhook records the
    // eventual capture), so record either way.
    if (payment.status === "authorized") {
      try {
        payment = await captureRazorpayPayment(paymentId, payment.amount);
      } catch (err) {
        console.error("Razorpay capture failed; recording authorized", err);
      }
    }

    const recorded = await recordRazorpayPayment({
      bookingId,
      amountRupees: payment.amount / 100,
      orderId,
      paymentId,
      customer: typeof customer === "string" ? customer : undefined,
    });
    return Response.json({ ok: true, payment: recorded }, { status: 201 });
  } catch (err) {
    console.error("Failed to verify/record Razorpay payment", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
