import { getActiveCampaign } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

// GET /api/campaigns/active → { campaign } — the campaign to show as the
// homepage popup (the most recent Active one), or null. Public: the homepage
// popup reads this without auth, and it never exposes inactive campaigns.
export async function GET() {
  const campaign = await getActiveCampaign();
  return Response.json({ campaign });
}
