import { createHash } from "crypto";
import { fetchRazorpayOrder, verifyWebhookSignature } from "@/lib/razorpay";
import {
  applyRazorpayRefund,
  recordFailedRazorpayPayment,
  recordRazorpayPayment,
} from "@/lib/razorpayPayments";
import {
  logPaymentEvent,
  summarize,
  wasWebhookProcessed,
} from "@/lib/paymentEvents";

// Signature-verified server-to-server events — never prerender or cache.
export const dynamic = "force-dynamic";

// Razorpay webhook — the safety net behind the checkout verify route, and the
// only source for failures and refund completions. Handled events:
//
//   payment.captured / order.paid → record the advance (if the customer's tab
//                                   died before /verify landed)
//   payment.failed                → record a "Failed" attempt for the admin
//   refund.processed              → mark the ledger row Refunded and settle
//                                   the matching refund request
//
// Anything else is acknowledged so Razorpay stops retrying. Idempotent twice
// over: each event id is remembered in payment_events (a redelivery returns
// early), and every handler is itself idempotent on Razorpay ids.
//
// Auth is the webhook signature, not a session: the raw body is HMAC'd with
// RAZORPAY_WEBHOOK_SECRET (set both on the dashboard webhook and in the env).
// All four events must be ticked on the dashboard webhook to arrive here.

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  amount_refunded?: number;
  status?: string;
  notes?: Record<string, string> | unknown[];
  error_description?: string;
  error_reason?: string;
}

interface RefundEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
  status?: string;
}

interface WebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: RefundEntity };
  };
}

const BOOKING_REF = /^BHJ-/;

// Razorpay sends `notes` as [] when empty — normalise to a plain object.
function notesOf(p: PaymentEntity | undefined): Record<string, string> {
  return p?.notes && !Array.isArray(p.notes)
    ? (p.notes as Record<string, string>)
    : {};
}

/** The booking ref (and payer) the payment belongs to. The ORDER's notes are
 *  set server-side when we create it, so they are the authority; the
 *  payment's own notes come from the checkout options (client-set) and are
 *  only a fallback when the order can't be fetched. */
async function bookingRefFor(
  p: PaymentEntity,
): Promise<{ bookingId: string; userId?: string }> {
  if (p.order_id) {
    try {
      const order = await fetchRazorpayOrder(p.order_id);
      const fromOrder = order.notes?.bookingId ?? "";
      if (BOOKING_REF.test(fromOrder)) {
        return { bookingId: fromOrder, userId: order.notes?.userId || undefined };
      }
    } catch {
      // fall through to the payment's notes
    }
  }
  const fromPayment = notesOf(p).bookingId ?? "";
  return { bookingId: BOOKING_REF.test(fromPayment) ? fromPayment : "" };
}

export async function POST(request: Request) {
  // Signature is computed over the exact raw bytes — read text, parse after.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Razorpay's unique id per event (same across redeliveries). Fall back to a
  // body hash so even a header-less delivery dedupes.
  const eventId =
    request.headers.get("x-razorpay-event-id") ||
    createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
  const name = event.event ?? "unknown";

  if (await wasWebhookProcessed(eventId)) {
    console.info(`[razorpay] webhook ${name} (${eventId}) → duplicate, ignored`);
    return Response.json({ ok: true, duplicate: true });
  }

  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const log = (outcome: string, bookingId?: string) =>
    logPaymentEvent({
      id: `EVT-${eventId}`,
      kind: "webhook",
      createdAt: new Date().toISOString(),
      event: name,
      eventId,
      outcome,
      ...(bookingId ? { bookingId } : {}),
      summary: summarize(refund ?? payment),
    });

  try {
    switch (name) {
      case "payment.captured":
      case "order.paid": {
        if (!payment?.id || !payment.order_id || !Number.isFinite(payment.amount)) {
          await log("skipped:no-payment-entity");
          return Response.json({ ok: true, skipped: "no-payment-entity" });
        }
        const { bookingId, userId } = await bookingRefFor(payment);
        if (!bookingId) {
          // A capture we can't tie to a booking — acknowledge (retries won't
          // fix it) but leave a trace for reconciliation.
          await log("skipped:no-booking-ref");
          return Response.json({ ok: true, skipped: "no-booking-ref" });
        }
        await recordRazorpayPayment({
          bookingId,
          userId,
          amountRupees: (payment.amount as number) / 100,
          orderId: payment.order_id,
          paymentId: payment.id,
          customer: notesOf(payment).customer,
        });
        await log("recorded", bookingId);
        return Response.json({ ok: true });
      }

      case "payment.failed": {
        if (!payment?.id || !payment.order_id) {
          await log("skipped:no-payment-entity");
          return Response.json({ ok: true, skipped: "no-payment-entity" });
        }
        const { bookingId } = await bookingRefFor(payment);
        if (!bookingId) {
          await log("skipped:no-booking-ref");
          return Response.json({ ok: true, skipped: "no-booking-ref" });
        }
        await recordFailedRazorpayPayment({
          bookingId,
          amountRupees: (payment.amount ?? 0) / 100,
          orderId: payment.order_id,
          paymentId: payment.id,
          customer: notesOf(payment).customer,
          reason: payment.error_description ?? payment.error_reason,
        });
        await log("recorded-failed", bookingId);
        return Response.json({ ok: true });
      }

      case "refund.processed": {
        if (!refund?.id || !refund.payment_id || !Number.isFinite(refund.amount)) {
          await log("skipped:no-refund-entity");
          return Response.json({ ok: true, skipped: "no-refund-entity" });
        }
        const applied = await applyRazorpayRefund({
          refundId: refund.id,
          paymentId: refund.payment_id,
          refundAmountPaise: refund.amount as number,
          totalRefundedPaise: Number.isFinite(payment?.amount_refunded)
            ? payment?.amount_refunded
            : undefined,
        });
        if (!applied) {
          await log("skipped:no-ledger-row");
          return Response.json({ ok: true, skipped: "no-ledger-row" });
        }
        await log("refund-applied", applied.bookingId);
        return Response.json({ ok: true });
      }

      default:
        await log(`skipped:${name}`);
        return Response.json({ ok: true, skipped: name });
    }
  } catch (err) {
    // Storage failed — return 5xx so Razorpay redelivers the event. The
    // "error" outcome doesn't count as processed, so the retry runs fully.
    console.error(`Failed to handle Razorpay webhook ${name}`, err);
    await log("error");
    return Response.json({ error: "Storage failed." }, { status: 500 });
  }
}
