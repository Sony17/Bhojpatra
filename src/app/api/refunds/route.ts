import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { parseListQuery } from "@/lib/validate";
import {
  store,
  toAdminRefund,
  displayDate,
  isOpenRefund,
  type RefundMethod,
  type StoredRefund,
} from "@/lib/refunds";
import type { StoredOrder } from "@/app/api/bookings/route";

// Refund requests are written at request time to Postgres (Neon) so the admin
// console sees them live — never prerender or cache this handler.
export const dynamic = "force-dynamic";

// The bookings a refund is claimed against — read-only here, to validate the
// claim and derive the customer/method/paid amount server-side.
const bookings = createStore<StoredOrder>({ table: "bookings", idField: "id" });

/** Map a booking's original payment method onto a refund rail. A "Connect"
 *  (COD) booking has no online rail, so its refund defaults to UPI. */
function refundMethodFor(order: StoredOrder): RefundMethod {
  return order.paymentMethod === "QR" ? "QR" : "UPI";
}

// GET /api/refunds → admin list of refund requests, newest first.
// Backward-compatible `{ refunds }`; adds a `Paginated` envelope when filtered.
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const records = (await store.list()).slice().reverse();
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
// of their own bookings. The customer/amount/method are all derived server-side
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

  // Amount is capped at what was actually paid; defaults to the full paid sum.
  const wanted = Number(body.amount);
  const amount =
    Number.isFinite(wanted) && wanted > 0 ? Math.min(Math.round(wanted), paid) : paid;

  const now = new Date();
  const seq = existing.length + 1;
  const record: StoredRefund = {
    id: `RFD-${now.getFullYear()}${String(seq).padStart(4, "0")}`,
    bookingId,
    userId: user.id,
    customer: order.customer || user.name || "Online Booking",
    ...(order.email ? { email: order.email } : {}),
    ...(order.phone ? { phone: order.phone } : {}),
    amount,
    reason,
    method: refundMethodFor(order),
    status: "Requested",
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

  return Response.json({ ok: true, refund: toAdminRefund(record) }, { status: 201 });
}
