import {
  ensureSeededCoupons,
  newCouponId,
  queryCoupons,
  toAdminCoupon,
  upsertCoupon,
  validateCoupon,
  type CouponRecord,
} from "@/lib/coupons";
import { parseListQuery } from "@/lib/validate";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/coupons?q&status&page&pageSize → Paginated<AdminCoupon>
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { q, status, page, pageSize } = parseListQuery(request.url);
  const rows = await ensureSeededCoupons();
  return Response.json(
    queryCoupons({ q, status: status as never, page, pageSize }, rows),
  );
}

// POST /api/coupons → create a coupon
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const check = validateCoupon(body);
  if (!check.ok || !check.value) {
    return Response.json({ error: check.error ?? "Invalid coupon." }, { status: 400 });
  }

  const record: CouponRecord = {
    id: newCouponId(),
    ...check.value,
    createdAt: new Date().toISOString(),
  };

  try {
    await upsertCoupon(record);
  } catch (err) {
    console.error("Failed to create coupon", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, coupon: toAdminCoupon(record) }, { status: 201 });
}
