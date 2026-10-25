import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { parseListQuery } from "@/lib/validate";
import {
  store,
  toAdminRefund,
  displayDate,
  isOpenRefund,
  nextRefundId,
  parseRefundPayout,
  toCustomerRefund,
  type RefundMethod,
  type StoredRefund,
} from "@/lib/refunds";
import { gatewayRefundCoverage } from "@/lib/razorpayPayments";
import { sendRefundRequestAlert, sendRefundUpdateToCustomer } from "@/lib/email";
import type { StoredOrder } from "@/app/api/bookings/route";

// Refund requests are written at request time to Postgres (Neon) so the admin
// console sees them live — never prerender or cache this handler.
export const dynamic = "force-dynamic";

// The bookings a refund is claimed against — read-only here, to validate the
// claim and derive the customer/method/paid amount server-side.
const bookings = createStore<StoredOrder>({ table: "bookings", idField: "id" });

/** The rail a refund goes back over. Razorpay only when a captured gateway
 *  payment is there to refund; otherwise the booking's manual rail (a
 *  "Connect" / COD booking has none, so it defaults to UPI). */
function refundMethodFor(order: StoredOrder, viaGateway: boolean): RefundMethod {
  if (viaGateway) return "Razorpay";
  return order.paymentMethod === "QR" ? "QR" : "UPI";
}

// GET /api/refunds → admin: every refund request, newest first.
// Backward-compatible `{ refunds }`; adds a `Paginated` envelope when filtered.
// A signed-in customer gets only their own refunds (customer view), so
// My Bookings can show where each one stands.
export async function GET(request: Request) {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;

  const records = (await store.list()).slice().reverse();
  if (guard.role !== "admin") {
    return Response.json({
      refunds: records.filter((r) => r.userId === guard.id).map(toCustomerRefund),
    });
  }
  const refunds = records.map(toAdminRefund);

  const { q, status, page, pageSize, hasQuery } = parseListQuery(request.url);
  if (!hasQuery) return Response.json({ refunds });

  const needle = q.trim().toLowerCase();
  const filtered = refunds.filter((r) => {
    const matchesQ =
      !needle ||
      r.id.toLowerCase().includes(needle) ||
      r.bookingId.toLowerCase().includes(needle) ||
      r.customer.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || r.status === status;
    return matchesQ && matchesStatus;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    refunds,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

// POST /api/refunds → a signed-in customer raises a refund request against one
// of their own bookings, or an admin raises one (full or partial) against any
// paid booking from the Refunds console. The customer/amount/method are all derived server-side
// from the persisted booking, so a tampered payload can't over-claim or spoof.
export async function POST(request: Request) {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const user = guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
  if (!/^BHJ-/.test(bookingId)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (!reason) {
    return Response.json(
      { error: "Please tell us why you're requesting a refund." },
      { status: 400 },
    );
  }

  const order = await bookings.get(bookingId);
  if (!order) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  // A customer may only claim against a booking they own. Legacy orders with no
  // recorded owner can't be self-served (they stay admin-only).
  const isAdmin = user.role === "admin";
  if (!isAdmin && (!order.userId || order.userId !== user.id)) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  // Nothing to refund on an unpaid booking.
  const paid = Number(order.paid) || 0;
  if (paid <= 0) {
    return Response.json(
      { error: "There's no payment on this booking to refund." },
      { status: 409 },
    );
  }

  // Only one open (Requested / Approved) claim per booking at a time.
  const existing = await store.list();
  if (existing.some((r) => r.bookingId === bookingId && isOpenRefund(r))) {
    return Response.json(
      { error: "A refund request for this booking is already in progress." },
      { status: 409 },
    );
  }

  // A refund Razorpay can't send back needs somewhere to go. The customer
  // says where up front; an admin raising one can leave it for later (they
  // record the UTR of whatever payout they make when processing it).
  const wanted = Number(body.amount);
  const amount =
    Number.isFinite(wanted) && wanted > 0 ? Math.min(Math.round(wanted), paid) : paid;
  // Fully refundable via Razorpay → no destination needed. Otherwise (UPI /
  // QR booking, or a booking paid partly outside Razorpay) some money has to
  // be sent by hand, so we need somewhere to send it.
  const coverage = await gatewayRefundCoverage(bookingId);
  const viaGateway = coverage >= amount;
  const payout = parseRefundPayout(body.payoutTo);
  if (payout && "error" in payout) {
    return Response.json({ error: payout.error, needsPayout: true }, { status: 400 });
  }
  if (!viaGateway && !payout && !isAdmin) {
    return Response.json(
      {
        error:
          coverage > 0
            ? `Only ₹${coverage.toLocaleString("en-IN")} of this can go back to your original payment. Tell us the UPI ID or bank account for the rest.`
            : "This booking wasn't paid online through Razorpay, so tell us the UPI ID or bank account to send your refund to.",
        needsPayout: true,
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const record: StoredRefund = {
    id: nextRefundId(existing, now),
    bookingId,
    // The booking's owner, even when an admin raises it on their behalf — so
    // the customer still sees the refund in My Bookings.
    ...(isAdmin
      ? order.userId
        ? { userId: order.userId }
        : {}
      : { userId: user.id }),
    customer: order.customer || (isAdmin ? "" : user.name) || "Online Booking",
    ...(order.email ? { email: order.email } : {}),
    ...(order.phone ? { phone: order.phone } : {}),
    amount,
    reason,
    method: refundMethodFor(order, coverage > 0),
    ...(payout && !viaGateway ? { payoutTo: payout } : {}),
    // An admin raising a refund has already decided on it — it starts
    // Approved, one "Process" click away from the gateway refund.
    status: isAdmin ? "Approved" : "Requested",
    raisedBy: isAdmin ? "admin" : "customer",
    requestedAt: displayDate(now),
    createdAt: now.toISOString(),
  };

  try {
    await store.upsert(record);
  } catch (err) {
    console.error("Failed to persist refund request", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Best-effort — never fails the request that already saved.
  await Promise.allSettled([
    sendRefundUpdateToCustomer(record),
    ...(isAdmin ? [] : [sendRefundRequestAlert(record)]),
  ]);

  return Response.json(
    { ok: true, refund: isAdmin ? toAdminRefund(record) : toCustomerRefund(record) },
    { status: 201 },
  );
}
