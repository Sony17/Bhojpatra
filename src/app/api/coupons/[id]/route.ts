import {
  getCoupon,
  removeCoupon,
  toAdminCoupon,
  upsertCoupon,
  validateCoupon,
  type CouponRecord,
} from "@/lib/coupons";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/coupons/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCoupon(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Coupon not found." }, { status: 404 });
  }
  return Response.json({ coupon: toAdminCoupon(record) });
}

// PATCH /api/coupons/[id] → update fields / toggle status
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

  const record = await getCoupon(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Coupon not found." }, { status: 404 });
  }

  const check = validateCoupon(body, true);
  if (!check.ok || !check.value) {
    return Response.json({ error: check.error ?? "Invalid coupon." }, { status: 400 });
  }

  const next: CouponRecord = { ...record, ...check.value };
  try {
    await upsertCoupon(next);
  } catch (err) {
    console.error("Failed to update coupon", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ coupon: toAdminCoupon(next) });
}

// DELETE /api/coupons/[id] → hard-delete (coupons carry no history)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCoupon(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Coupon not found." }, { status: 404 });
  }
  await removeCoupon(decodeURIComponent(id));
  return Response.json({ ok: true });
}
