import { requireRole } from "@/lib/auth";
import {
  deriveSettlements,
  displayDate,
  periodKeyOfId,
  settlementStore,
  type StoredSettlement,
} from "@/lib/settlements";

export const dynamic = "force-dynamic";

// PATCH /api/settlements/[id] → { status: "Settled" } — admin releases a
// vendor's payout for a period. One-way: a Settled payout can't be reopened.
// What gets persisted is a snapshot of the derived row (vendor, period,
// bookings, amount) plus who released it and when, for audit.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const admin = guard;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.status !== "Settled") {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  // The row must exist in the current derivation — you can only settle a payout
  // that real completed bookings actually produced.
  const settlements = await deriveSettlements();
  const row = settlements.find((s) => s.id === decodeURIComponent(id));
  if (!row) {
    return Response.json({ error: "Settlement not found." }, { status: 404 });
  }
  if (row.status === "Settled") {
    return Response.json(
      { error: "This payout has already been settled." },
      { status: 409 },
    );
  }

  const now = new Date();
  const record: StoredSettlement = {
    id: row.id,
    vendor: row.vendor,
    period: row.period,
    periodKey: periodKeyOfId(row.id),
    bookings: row.bookings,
    amount: row.amount,
    status: "Settled",
    settledAt: displayDate(now),
    createdAt: now.toISOString(),
    settledBy: admin.id,
  };

  try {
    await settlementStore.upsert(record);
  } catch (err) {
    console.error("Failed to persist settlement", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    settlement: { ...row, status: "Settled" as const },
  });
}
