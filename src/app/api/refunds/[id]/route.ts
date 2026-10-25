import { requireRole } from "@/lib/auth";
import {
  store,
  toAdminRefund,
  displayDate,
  isRefundStatus,
  canTransition,
  parsePayoutRef,
  gatewayRefunded,
} from "@/lib/refunds";
import {
  gatewayRefundCoverage,
  refundBookingGatewayPayment,
} from "@/lib/razorpayPayments";
import { sendRefundUpdateToCustomer } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/refunds/[id] — admin fetch of a single refund request.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const refund = await store.get(decodeURIComponent(id));
  if (!refund) {
    return Response.json({ error: "Refund not found." }, { status: 404 });
  }
  return Response.json({ refund: toAdminRefund(refund) });
}

// PATCH /api/refunds/[id] → { status, adminNote?, payoutRef? } — admin advances
// a refund through its lifecycle (Requested → Approved → Processed, or
// Declined). Only valid transitions are accepted; reaching a terminal state
// stamps `processedAt`. Processing a refund Razorpay can't pay out requires
// `payoutRef` — the UTR of the manual transfer — so "Processed" always means
// money actually moved. `skipGateway: true` records a by-hand payout of the
// whole remainder instead of trying Razorpay.
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

  const refund = await store.get(decodeURIComponent(id));
  if (!refund) {
    return Response.json({ error: "Refund not found." }, { status: 404 });
  }

  const next = { ...refund };

  if (body.status !== undefined) {
    if (!isRefundStatus(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    if (!canTransition(refund.status, body.status)) {
      return Response.json(
        { error: `Cannot move a ${refund.status} refund to ${body.status}.` },
        { status: 409 },
      );
    }
    // Processing moves REAL money. Whatever the booking's captured Razorpay
    // payments can cover goes back through Razorpay (spread across them); any
    // rest — or all of it for UPI / QR bookings — the team pays by hand and
    // records the UTR. `skipGateway` (with a UTR) records that the team paid
    // the whole remainder by hand, e.g. after Razorpay refused.
    if (body.status === "Processed" && refund.status !== "Processed") {
      if (body.payoutRef !== undefined && !parsePayoutRef(body.payoutRef)) {
        return Response.json(
          { error: "Enter a valid UTR / transaction reference (6–40 letters or digits).", needsPayoutRef: true },
          { status: 400 },
        );
      }
      const payoutRef = parsePayoutRef(body.payoutRef);
      const owed = Math.max(0, refund.amount - gatewayRefunded(refund) - (refund.manualAmount ?? 0));
      const coverage = body.skipGateway === true ? 0 : await gatewayRefundCoverage(refund.bookingId);
      const viaGateway = Math.min(owed, coverage);
      const byHand = owed - viaGateway;

      if (byHand > 0 && !payoutRef) {
        return Response.json(
          {
            error:
              viaGateway > 0
                ? `₹${viaGateway.toLocaleString("en-IN")} can go back through Razorpay, but ₹${byHand.toLocaleString("en-IN")} was paid outside it. Pay that part to the customer, enter the UTR, then process again.`
                : `No Razorpay payment covers this refund, so no money moves automatically. Pay the customer ₹${byHand.toLocaleString("en-IN")}, then enter the UTR / transaction reference to mark it processed.`,
            needsPayoutRef: true,
          },
          { status: 400 },
        );
      }

      if (viaGateway > 0) {
        const { legs, error } = await refundBookingGatewayPayment(refund.bookingId, viaGateway);
        if (legs.length) {
          next.gatewayRefunds = [...(next.gatewayRefunds ?? []), ...legs];
          next.gatewayRefundId ??= legs[0].id;
        }
        if (error) {
          // Keep any refunds that did go through, so a retry only sends the rest.
          const sent = legs.reduce((sum, l) => sum + l.amount, 0);
          if (legs.length) await store.upsert(next).catch(() => undefined);
          console.error("Razorpay refund failed", error);
          return Response.json(
            {
              error:
                (sent > 0 ? `₹${sent.toLocaleString("en-IN")} went back through Razorpay, but the rest was refused: ` : "Razorpay rejected the refund: ") +
                `"${error}". The refund is still Approved. Retry, or pay the customer by hand, tick "Paid by hand" and enter the UTR.`,
              gatewayError: error,
              needsPayoutRef: true,
              ...(legs.length ? { refund: toAdminRefund(next) } : {}),
            },
            { status: 502 },
          );
        }
      }
      if (byHand > 0) {
        next.payoutRef = payoutRef;
        next.manualAmount = (next.manualAmount ?? 0) + byHand;
      }
      next.gatewayFailure = undefined;
    }

    next.status = body.status;
    // Stamp the terminal date once, when the refund first settles.
    if (
      (body.status === "Processed" || body.status === "Declined") &&
      !next.processedAt
    ) {
      next.processedAt = displayDate(new Date());
    }
  }

  if (typeof body.adminNote === "string") {
    next.adminNote = body.adminNote.trim().slice(0, 1000) || undefined;
  }

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update refund", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Tell the customer when the status moved (best-effort, never blocks).
  if (next.status !== refund.status) {
    await sendRefundUpdateToCustomer(next).catch((err) =>
      console.error("Refund update email failed", err),
    );
  }

  return Response.json({ ok: true, refund: toAdminRefund(next) });
}
