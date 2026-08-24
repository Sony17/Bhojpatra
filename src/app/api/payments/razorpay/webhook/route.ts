import { verifyWebhookSignature } from "@/lib/razorpay";
import { recordRazorpayPayment } from "@/lib/razorpayPayments";

// Signature-verified server-to-server events — never prerender or cache.
export const dynamic = "force-dynamic";

// Razorpay webhook — the safety net behind the checkout verify route. If the
// customer pays but their tab dies before /verify lands, `payment.captured`
// still records the advance here. Idempotent on the order id, so the same
// event delivered twice (or after verify already recorded it) is a no-op.
//
// Auth is the webhook signature, not a session: the raw body is HMAC'd with
// RAZORPAY_WEBHOOK_SECRET (set both on the dashboard webhook and in the env).
export async function POST(request: Request) {
  // Signature is computed over the exact raw bytes — read text, parse after.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          notes?: Record<string, string>;
        };
      };
    };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Only captured payments move money; everything else (failed, authorized,
  // refund events, …) is acknowledged so Razorpay stops retrying.
  if (event.event !== "payment.captured") {
    return Response.json({ ok: true, skipped: event.event ?? "unknown" });
  }

  const payment = event.payload?.payment?.entity;
  const bookingId = payment?.notes?.bookingId ?? "";
  if (
    !payment?.id ||
    !payment.order_id ||
    !Number.isFinite(payment.amount) ||
    !/^BHJ-/.test(bookingId)
  ) {
    // A capture we can't tie to a booking — acknowledge (retries won't fix it)
    // but leave a trace for reconciliation.
    console.error("Razorpay capture without a usable booking ref", payment?.id);
    return Response.json({ ok: true, skipped: "no-booking-ref" });
  }

  try {
    await recordRazorpayPayment({
      bookingId,
      amountRupees: (payment.amount as number) / 100,
      orderId: payment.order_id,
      paymentId: payment.id,
      customer: payment.notes?.customer,
    });
  } catch (err) {
    // Storage failed — return 5xx so Razorpay redelivers the event.
    console.error("Failed to record webhook payment", err);
    return Response.json({ error: "Storage failed." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
