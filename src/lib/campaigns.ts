/**
 * Campaign store.
 *
 * Backs the admin "Campaigns" manager and the homepage image popup. A campaign
 * is just an image (uploaded data URL or pasted URL) plus an optional
 * click-through link; the most recently created *Active* campaign is what every
 * homepage visitor sees as a popup (see `getActiveCampaign`). Campaigns are
 * hard-deletable (they carry no history), so the DELETE route calls
 * `store.remove`. There is no seed list — the store starts empty until an admin
 * creates one.
 */
import path from "path";
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type { AdminCampaign, CampaignStatus } from "@/lib/admin/types";

export interface CampaignRecord extends AdminCampaign {
  createdAt: string;
}

export const CAMPAIGNS_STORE = path.join(
  process.cwd(),
  "data",
  "campaigns.json",
);

const store = createStore<CampaignRecord>({
  table: "campaigns",
  file: CAMPAIGNS_STORE,
  idField: "id",
});

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["Active", "Inactive"];

export function readCampaigns(): Promise<CampaignRecord[]> {
  return store.list();
}

export function getCampaign(id: string): Promise<CampaignRecord | null> {
  return store.get(id);
}

export function upsertCampaign(rec: CampaignRecord): Promise<void> {
  return store.upsert(rec);
}

export function removeCampaign(id: string): Promise<void> {
  return store.remove(id);
}

export function newCampaignId(): string {
  return `CMP-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/**
 * The campaign shown as the homepage popup: the most recently created Active
 * one. `store.list()` returns insertion order (seq asc), so the last Active row
 * is the newest. Returns null when nothing is running.
 */
export async function getActiveCampaign(): Promise<AdminCampaign | null> {
  const rows = await store.list();
  let latest: CampaignRecord | null = null;
  for (const c of rows) if (c.status === "Active") latest = c;
  return latest ? toAdminCampaign(latest) : null;
}

export function toAdminCampaign(r: CampaignRecord): AdminCampaign {
  return {
    id: r.id,
    name: r.name,
    image: r.image,
    linkUrl: r.linkUrl,
    status: r.status,
  };
}

export function isCampaignStatus(v: unknown): v is CampaignStatus {
  return v === "Active" || v === "Inactive";
}

export interface CampaignValidation {
  ok: boolean;
  error?: string;
  value?: Omit<AdminCampaign, "id">;
}

/**
 * Validate a campaign create/update body. `partial` allows an update that only
 * carries some fields (the caller merges onto the existing record).
 */
export function validateCampaign(
  body: Record<string, unknown>,
  partial = false,
): CampaignValidation {
  const out: Partial<Omit<AdminCampaign, "id">> = {};

  // name — required label for the admin list
  if (body.name !== undefined || !partial) {
    if (typeof body.name !== "string" || !body.name.trim())
      return { ok: false, error: "A campaign name is required." };
    out.name = body.name.trim();
  }
  // image — required; the picture shown in the popup
  if (body.image !== undefined || !partial) {
    if (typeof body.image !== "string" || !body.image.trim())
      return { ok: false, error: "A campaign image is required." };
    out.image = body.image.trim();
  }
  // linkUrl — optional click-through
  if (body.linkUrl !== undefined || !partial) {
    out.linkUrl = typeof body.linkUrl === "string" ? body.linkUrl.trim() : "";
  }
  if (body.status !== undefined || !partial) {
    out.status = isCampaignStatus(body.status) ? body.status : "Active";
  }
  return { ok: true, value: out as Omit<AdminCampaign, "id"> };
}
