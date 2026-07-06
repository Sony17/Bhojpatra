import path from "path";
import { isValidVpa } from "@/lib/upi";
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { parseListQuery } from "@/lib/validate";
import { sendPaymentAlert } from "@/lib/email";

// Payments are recorded at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export type StoredPaymentMethod = "UPI" | "QR";
// A payment starts life as an advance and can later be settled or refunded by
// the admin payment tracker (`/api/payments/[id]`).
export type StoredPaymentStatus =
  | "Advance Received"
  | "Settled"
  | "Pending"
  | "Refunded";
export const STORED_PAYMENT_STATUSES: StoredPaymentStatus[] = [
  "Advance Received",
  "Settled",
  "Pending",
  "Refunded",
];

export interface StoredPayment {
  id: string;
  bookingId: string;
  customer: string;
  method: StoredPaymentMethod;
  type: "Advance";
  amount: number;
  vpa: string;
  txnRef: string;
  status: StoredPaymentStatus;
  createdAt: string;
}

const store = createStore<StoredPayment>({
  table: "payments",
  file: path.join(process.cwd(), "data", "payments.json"),
  idField: "id",
});

// List recorded payments, newest first (used by the admin payment tracker).
// Backward-compatible `{ payments }`; adds a `Paginated` envelope when filtered.
export async function GET(request: Request) {
  const payments = (await store.list()).slice().reverse();
  const { q, status, method, page, pageSize, hasQuery } = parseListQuery(
    request.url,
  );
  if (!hasQuery) return Response.json({ payments });

  const needle = q.trim().toLowerCase();
  const filtered = payments.filter((p) => {
    const matchesQ =
      !needle ||
      p.id.toLowerCase().includes(needle) ||
      p.bookingId.toLowerCase().includes(needle) ||
      p.customer.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || p.status === status;
    const matchesMethod = method === "All" || p.method === method;
    return matchesQ && matchesStatus && matchesMethod;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    payments,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

export async function POST(request: Request) {
  // Payments may only be recorded for a signed-in guest — reject anonymous
  // posts (the booking UI gates payment behind login before reaching here).
  const guard = await requireRole();
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, amount, method, vpa, txnRef, customer } = (body ??
    {}) as Record<string, unknown>;

  if (typeof bookingId !== "string" || !/^BHJ-/.test(bookingId)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  if (typeof vpa !== "string" || !isValidVpa(vpa)) {
    return Response.json({ error: "Invalid UPI ID." }, { status: 400 });
  }

  const normalizedMethod: StoredPaymentMethod = method === "qr" ? "QR" : "UPI";
  const ref =
    typeof txnRef === "string" && txnRef ? txnRef : `${bookingId}-ADVANCE`;

  const payments = await store.list();

  // Idempotent on the transaction reference so a repeat confirmation (e.g. the
  // customer double-taps "I've paid") doesn't create a duplicate record.
  const existing = payments.find((p) => p.txnRef === ref);
  if (existing) {
    return Response.json({ ok: true, payment: existing }, { status: 200 });
  }

  const payment: StoredPayment = {
    id: `PMT-W${(payments.length + 1).toString().padStart(4, "0")}`,
    bookingId,
    customer:
      typeof customer === "string" && customer.trim()
        ? customer.trim()
        : "Online Booking",
    method: normalizedMethod,
    type: "Advance",
    amount: Math.round(amt),
    vpa: vpa.trim(),
    txnRef: ref,
    status: "Advance Received",
    createdAt: new Date().toISOString(),
  };

  try {
    await store.upsert(payment);
  } catch (err) {
    console.error("Failed to persist payment", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // A duplicate txnRef already returned above, so reaching here means a new
  // payment — alert the owners (best-effort; never blocks the response).
  await sendPaymentAlert(payment);

  return Response.json({ ok: true, payment }, { status: 201 });
}
