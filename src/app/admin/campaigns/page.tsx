import type { Metadata } from "next";
import CampaignManager from "@/components/admin/campaigns/CampaignManager";

export const metadata: Metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return <CampaignManager />;
}
