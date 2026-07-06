import {
  getCampaign,
  removeCampaign,
  toAdminCampaign,
  upsertCampaign,
  validateCampaign,
  type CampaignRecord,
} from "@/lib/campaigns";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCampaign(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Campaign not found." }, { status: 404 });
  }
  return Response.json({ campaign: toAdminCampaign(record) });
}

// PATCH /api/campaigns/[id] → update fields / toggle status
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

  const record = await getCampaign(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Campaign not found." }, { status: 404 });
  }

  const check = validateCampaign(body, true);
  if (!check.ok || !check.value) {
    return Response.json(
      { error: check.error ?? "Invalid campaign." },
      { status: 400 },
    );
  }

  const next: CampaignRecord = { ...record, ...check.value };
  try {
    await upsertCampaign(next);
  } catch (err) {
    console.error("Failed to update campaign", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ campaign: toAdminCampaign(next) });
}

// DELETE /api/campaigns/[id] → hard-delete
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const record = await getCampaign(decodeURIComponent(id));
  if (!record) {
    return Response.json({ error: "Campaign not found." }, { status: 404 });
  }
  await removeCampaign(decodeURIComponent(id));
  return Response.json({ ok: true });
}
