import {
  newCampaignId,
  readCampaigns,
  toAdminCampaign,
  upsertCampaign,
  validateCampaign,
  type CampaignRecord,
} from "@/lib/campaigns";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/campaigns → { data } — the full list for the admin manager.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const rows = await readCampaigns();
  return Response.json({ data: rows.map(toAdminCampaign) });
}

// POST /api/campaigns { name, image, linkUrl, status } → create a campaign
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const check = validateCampaign(body);
  if (!check.ok || !check.value) {
    return Response.json(
      { error: check.error ?? "Invalid campaign." },
      { status: 400 },
    );
  }

  const record: CampaignRecord = {
    id: newCampaignId(),
    ...check.value,
    createdAt: new Date().toISOString(),
  };

  try {
    await upsertCampaign(record);
  } catch (err) {
    console.error("Failed to create campaign", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json(
    { ok: true, campaign: toAdminCampaign(record) },
    { status: 201 },
  );
}
