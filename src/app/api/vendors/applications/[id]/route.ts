import {
  readVendorApplications,
  removeVendorApplication,
  toAdminApplication,
  writeVendorApplications,
} from "@/lib/vendorApplications";
import { readKycDocuments, writeKycDocuments } from "@/lib/kyc";
import { requireRole } from "@/lib/auth";
import type { VerificationStatus } from "@/lib/admin/types";

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
  } else {
    return Response.json(
      { error: "Provide a status or a document update." },
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
