import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
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
  const { id } = await ctx.params;
  const payment = await store.get(decodeURIComponent(id));
  if (!payment) {
    return Response.json({ error: "Payment not found." }, { status: 404 });
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
