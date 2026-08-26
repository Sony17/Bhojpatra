import { createStore } from "@/lib/store";
import { getSessionUser, requireRole } from "@/lib/auth";
import type { PartnerRecord } from "../route";

export const dynamic = "force-dynamic";

const store = createStore<PartnerRecord>({
  table: "partners",
  idField: "code",
});

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function toPublicPartner(p: PartnerRecord) {
  return {
    code: p.code,
    name: p.name,
    type: p.type,
    ...(p.businessName ? { businessName: p.businessName } : {}),
  };
}

// GET /api/partners/[code]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const rawCode = decodeURIComponent(code).trim();
  const partner =
    (await store.get(rawCode.toUpperCase())) ?? (await store.get(rawCode));
  if (!partner || partner.deleted) {
    return Response.json({ error: "Partner not found." }, { status: 404 });
  }

  const user = await getSessionUser();
  if (user?.role === "admin") {
    return Response.json({ partner });
  }

  return Response.json({ partner: toPublicPartner(partner) });
}

// PATCH /api/partners/[code] → edit contact details
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { code } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const partner = await store.get(decodeURIComponent(code));
  if (!partner || partner.deleted) {
    return Response.json({ error: "Partner not found." }, { status: 404 });
  }

  const next: PartnerRecord = { ...partner };
  if (str(body.name)) next.name = str(body.name)!;
  if (body.businessName !== undefined) next.businessName = str(body.businessName);
  if (body.phone !== undefined) next.phone = str(body.phone);
  if (body.email !== undefined) next.email = str(body.email);
  if (body.city !== undefined) next.city = str(body.city);
  if (body.gst !== undefined) next.gst = str(body.gst);

  try {
    await store.upsert(next);
  } catch (err) {
    console.error("Failed to update partner", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ partner: next });
}

// DELETE /api/partners/[code] → soft-delete (keeps referral attribution history)
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { code } = await ctx.params;
  const partner = await store.get(decodeURIComponent(code));
  if (!partner) {
    return Response.json({ error: "Partner not found." }, { status: 404 });
  }
  if (!partner.deleted) await store.upsert({ ...partner, deleted: true });
  return Response.json({ ok: true });
}
