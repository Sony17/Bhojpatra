import {
  getCustomer,
  isCustomerStatus,
  toAdminCustomer,
  upsertCustomer,
  type CustomerRecord,
} from "@/lib/customers";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validate";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCustomer(decodeURIComponent(id));
  if (!record || record.deleted) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }
  return Response.json({ customer: toAdminCustomer(record) });
}

// PATCH /api/customers/[id] → edit fields / flip status
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

  const record = await getCustomer(decodeURIComponent(id));
  if (!record || record.deleted) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }

  const next: CustomerRecord = { ...record };
  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (body.email !== undefined) {
    if (!isValidEmail(body.email))
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    next.email = (body.email as string).trim().toLowerCase();
  }
  if (body.phone !== undefined) {
    if (!isValidPhone(body.phone))
      return Response.json({ error: "Invalid mobile number." }, { status: 400 });
    next.phone = normalizePhone((body.phone as string).trim());
  }
  if (typeof body.city === "string" && body.city.trim()) next.city = body.city.trim();
  if (body.status !== undefined) {
    if (!isCustomerStatus(body.status))
      return Response.json({ error: "Invalid status." }, { status: 400 });
    next.status = body.status;
  }

  try {
    await upsertCustomer(next);
  } catch (err) {
    console.error("Failed to update customer", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ customer: toAdminCustomer(next) });
}

// DELETE /api/customers/[id] → soft-delete (keeps the row for audit)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCustomer(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }
  if (!record.deleted) {
    await upsertCustomer({ ...record, deleted: true, status: "Inactive" });
  }
  return Response.json({ ok: true });
}
