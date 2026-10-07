import {
  applicationForOwner,
  getVendorApplication,
  readVendorApplications,
  removeVendorApplication,
  saveVendorApplication,
  toAdminApplication,
  withHistory,
  type VendorApplicationRecord,
} from "@/lib/vendorApplications";
import { getKycDocument, saveKycDocument } from "@/lib/kyc";
import { listLiveVendorRecords, saveVendor } from "@/lib/vendorMenus";
import { requireRole } from "@/lib/auth";
import { parseTiers } from "@/lib/admin/types";
import type { VerificationStatus } from "@/lib/admin/types";
import { sendVendorDecisionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const STATUSES: VerificationStatus[] = ["Pending", "Verified", "Rejected"];
const MAX_REASON = 500;

function isStatus(v: unknown): v is VerificationStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}

/**
 * Review a vendor application.
 *   { status: "Verified" }      → approve. Refused while any document is
 *                                 Rejected; Pending documents become Verified.
 *   { status: "Rejected", reason, changesRequested? }
 *                               → turn down (reason required). With
 *                                 `changesRequested: true` the vendor is asked
 *                                 to fix and resubmit instead.
 *   { status: "Pending" }       → reopen a decided application.
 *   { document: { kind, status } } → flip a single KYC document's state
 *   { tiers }                   → assign the marketplace tiers this vendor gets
 *                                 (may accompany a status change to approve +
 *                                 assign in one call). Propagates to the linked
 *                                 live vendor so the public catalog reflects it.
 *
 * Only the one application (and the one KYC row) touched is written — no
 * read-all/write-all, so concurrent reviews can't overwrite each other.
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

  const found = await getVendorApplication(id);
  if (!found) {
    return Response.json({ error: "Application not found." }, { status: 404 });
  }
  const record: VendorApplicationRecord = {
    ...found,
    documents: found.documents.map((d) => ({ ...d })),
  };
  const now = new Date().toISOString();
  const by = guard.email;

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

  let decision: "verified" | "rejected" | "changes-requested" | null = null;
  let kycSync: { docId?: string; status: VerificationStatus }[] = [];

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
    kycSync = [{ docId: target.docId, status: doc.status }];
    record.history = withHistory(record, {
      at: now,
      by,
      action: "document",
      note: `${target.kind} → ${doc.status}`,
    });
  } else if (isStatus(body.status)) {
    const next = body.status;
    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, MAX_REASON) : "";

    if (next === "Verified") {
      // An explicit document rejection must be resolved first — approving
      // must never silently overwrite it.
      const rejected = record.documents.filter((d) => d.status === "Rejected");
      if (rejected.length) {
        return Response.json(
          {
            error: `${rejected.map((d) => d.kind).join(", ")} ${
              rejected.length > 1 ? "are" : "is"
            } marked Rejected. Verify ${
              rejected.length > 1 ? "them" : "it"
            } or request changes before approving.`,
          },
          { status: 409 },
        );
      }
      for (const d of record.documents) {
        if (d.status === "Pending") {
          d.status = "Verified";
          kycSync.push({ docId: d.docId, status: "Verified" });
        }
      }
      record.status = "Verified";
      record.changesRequested = undefined;
      record.reviewReason = undefined;
      decision = "verified";
    } else if (next === "Rejected") {
      if (reason.length < 3) {
        return Response.json(
          { error: "Add a short reason for the vendor." },
          { status: 400 },
        );
      }
      const changes = body.changesRequested === true;
      record.status = "Rejected";
      record.changesRequested = changes || undefined;
      record.reviewReason = reason;
      decision = changes ? "changes-requested" : "rejected";
    } else {
      record.status = "Pending";
      record.changesRequested = undefined;
    }
    record.reviewedAt = now;
    record.reviewedBy = by;
    record.history = withHistory(record, {
      at: now,
      by,
      action: decision ?? "reopened",
      ...(reason && next === "Rejected" ? { note: reason } : {}),
    });
  } else if (!tiers.length) {
    return Response.json(
      { error: "Provide a status, tiers or a document update." },
      { status: 400 },
    );
  }

  try {
    await saveVendorApplication(record);
  } catch (err) {
    console.error("Failed to update vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Keep the KYC file store's status in step (best-effort, one row each).
  for (const { docId, status } of kycSync) {
    try {
      await syncKycStatus(docId, status);
    } catch (err) {
      console.error("Failed to sync KYC document status", docId, err);
    }
  }

  // Mirror the review decision onto the vendor's live catalog record (if they've
  // already built a profile): verifying publishes them and grants the verified
  // badge, rejecting takes them down, and tier assignments follow. Vendors
  // reviewed before publishing a menu inherit this at menu-save time instead.
  // Best-effort: a sync failure must not fail the review write that succeeded.
  if (isStatus(body.status) || tiers.length) {
    try {
      await syncLiveVendorFromReview(record, isStatus(body.status));
    } catch (err) {
      console.error("Failed to sync review decision to live vendor", err);
    }
  }

  if (decision) await sendVendorDecisionEmail(record, decision);

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
  if (!(await getVendorApplication(id))) {
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

/** Push the admin's review decision onto the vendor's live catalog record,
 *  matched by owning account (login email for legacy applications). No-op when
 *  the vendor hasn't published a profile yet — they inherit the same decision
 *  when they next save their menu.
 *
 *  Verifying publishes the vendor (moderation → Approved) and lights the
 *  verified badge. Rejecting / reopening takes them off every customer surface
 *  by returning them to Pending (not Hidden), so a later re-approval restores
 *  them. An explicit admin takedown ("Hidden") is never resurrected. */
async function syncLiveVendorFromReview(
  app: VendorApplicationRecord,
  statusChanged: boolean,
): Promise<void> {
  const email = app.email.trim().toLowerCase();
  const records = await listLiveVendorRecords();
  const live =
    (app.ownerUserId
      ? records.find((r) => r.ownerUserId === app.ownerUserId)
      : undefined) ??
    records.find((r) => r.ownerEmail?.trim().toLowerCase() === email);
  if (!live) return;

  // Never let a stale legacy row overwrite a vendor whose account has a
  // different (newer) application.
  if (live.ownerUserId) {
    const current = applicationForOwner(await readVendorApplications(), {
      id: live.ownerUserId,
      email: live.ownerEmail ?? "",
    });
    if (current && current.id !== app.id) return;
  }

  const verified = app.status === "Verified";
  const hidden = live.moderation === "Hidden";
  await saveVendor({
    ...live,
    // A tiers-only update leaves visibility alone.
    ...(statusChanged
      ? {
          verified,
          // Approving the application approves the content the admin just
          // reviewed; any other outcome takes the vendor (and any kept
          // snapshot) offline.
          moderation: hidden ? "Hidden" : verified ? "Approved" : "Pending",
          approvedSnapshot: undefined,
        }
      : {}),
    ...(app.assignedTiers?.length ? { tiers: app.assignedTiers } : {}),
    updatedAt: new Date().toISOString(),
  });
}

/** Keep the KYC file store's status in step with the review decision. */
async function syncKycStatus(
  docId: string | undefined,
  status: VerificationStatus,
): Promise<void> {
  if (!docId) return;
  const target = await getKycDocument(docId);
  if (!target || target.status === status) return;
  await saveKycDocument({ ...target, status });
}
