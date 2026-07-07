import {
  readVendorApplications,
  removeVendorApplication,
  toAdminApplication,
  writeVendorApplications,
} from "@/lib/vendorApplications";
import { readKycDocuments, writeKycDocuments } from "@/lib/kyc";
import { listLiveVendorRecords, saveVendor } from "@/lib/vendorMenus";
import { requireRole } from "@/lib/auth";
import { parseTiers } from "@/lib/admin/types";
import type { VendorTier, VerificationStatus } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

const STATUSES: VerificationStatus[] = ["Pending", "Verified", "Rejected"];

function isStatus(v: unknown): v is VerificationStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}

/**
 * Review a vendor application.
 *   { status }                  → set the whole application's verification state
 *                                 (approving also verifies every document)
 *   { document: { kind, status } } → flip a single KYC document's state
 *   { tiers }                   → assign the marketplace tiers this vendor gets
 *                                 (may accompany a status change to approve +
 *                                 assign in one call). Propagates to the linked
 *                                 live vendor so the public catalog reflects it.
 */
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

  const records = await readVendorApplications();
  const record = records.find((r) => r.id === id);
  if (!record) {
    return Response.json({ error: "Application not found." }, { status: 404 });
  }

  const doc = (body.document ?? null) as Record<string, unknown> | null;

  // Tier assignment can ride along with a status change (approve + assign) or
  // arrive on its own while the vendor is still pending. Reject an explicit but
  // empty selection — a vendor must sit in at least one tier.
  const tiersProvided = Array.isArray(body.tiers);
  const tiers = parseTiers(body.tiers);
  if (tiersProvided && tiers.length === 0) {
    return Response.json({ error: "Assign at least one tier." }, { status: 400 });
  }
  if (tiers.length) record.assignedTiers = tiers;

  if (doc) {
    const kind = doc.kind;
    if (!isStatus(doc.status)) {
      return Response.json(
        { error: "Unknown document status." },
        { status: 400 },
      );
    }
    const target = record.documents.find((d) => d.kind === kind);
    if (!target) {
      return Response.json(
        { error: "Unknown document for this application." },
        { status: 400 },
      );
    }
    target.status = doc.status;
    await syncKycStatus(target.docId, doc.status);
  } else if (isStatus(body.status)) {
    record.status = body.status;
    record.reviewedAt = new Date().toISOString();
    // Approving an application verifies all of its documents (mirrors the
    // previous console behaviour).
    if (body.status === "Verified") {
      for (const d of record.documents) {
        d.status = "Verified";
        await syncKycStatus(d.docId, "Verified");
      }
    }
  } else if (!tiers.length) {
    return Response.json(
      { error: "Provide a status, tiers or a document update." },
      { status: 400 },
    );
  }

  try {
    await writeVendorApplications(records);
  } catch (err) {
    console.error("Failed to update vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Mirror the tier decision onto the vendor's live catalog record (if they've
  // already built a profile). Vendors approved before publishing a menu inherit
  // it later at menu-save time. Best-effort: a sync failure must not fail the
  // review write that already succeeded.
  if (record.assignedTiers?.length && (tiers.length || record.status === "Verified")) {
    try {
      await syncLiveVendorTiers(record.email, record.assignedTiers);
    } catch (err) {
      console.error("Failed to sync assigned tiers to live vendor", err);
    }
  }

  return Response.json({ application: toAdminApplication(record) });
}

// DELETE /api/vendors/applications/[id] → archive (remove) an application.
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const records = await readVendorApplications();
  if (!records.some((r) => r.id === id)) {
    return Response.json({ error: "Application not found." }, { status: 404 });
  }
  try {
    await removeVendorApplication(id);
  } catch (err) {
    console.error("Failed to delete vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}

/** Push the admin's tier decision onto the vendor's live catalog record, matched
 *  by login email. No-op when the vendor hasn't published a profile yet — they
 *  inherit `assignedTiers` when they next save their menu. */
async function syncLiveVendorTiers(
  email: string,
  tiers: VendorTier[],
): Promise<void> {
  const target = email.trim().toLowerCase();
  if (!target) return;
  const records = await listLiveVendorRecords();
  const live = records.find(
    (r) => r.ownerEmail?.trim().toLowerCase() === target,
  );
  if (!live) return;
  live.tiers = tiers;
  live.updatedAt = new Date().toISOString();
  await saveVendor(live);
}

/** Keep the KYC file store's status in step with the review decision. */
async function syncKycStatus(
  docId: string | undefined,
  status: VerificationStatus,
): Promise<void> {
  if (!docId) return;
  const docs = await readKycDocuments();
  const target = docs.find((d) => d.id === docId);
  if (!target || target.status === status) return;
  target.status = status;
  await writeKycDocuments(docs);
}
