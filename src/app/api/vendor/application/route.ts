import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import { getKycDocument } from "@/lib/kyc";
import { findVendorByOwner } from "@/lib/vendorMenus";
import {
  findApplicationForOwner,
  saveVendorApplication,
  type VendorApplicationRecord,
} from "@/lib/vendorApplications";
import {
  applicationStage,
  buildApplication,
  parseSubmissionIdentity,
  validateSubmission,
} from "@/lib/vendorOnboarding";
import { sendVendorApplicationAlert } from "@/lib/email";

export const dynamic = "force-dynamic";

/** What the vendor may see of their own application (no admin notes beyond
 *  the reason addressed to them, no reviewer identity). */
function vendorView(app: VendorApplicationRecord | null) {
  if (!app) return null;
  return {
    id: app.id,
    status: app.status,
    stage: applicationStage(app),
    ...(app.reviewReason ? { reviewReason: app.reviewReason } : {}),
    ...(app.reviewedAt ? { reviewedAt: app.reviewedAt } : {}),
    submittedAt: app.submittedAt,
  };
}

// GET /api/vendor/application → { application } — the signed-in vendor's own
// application status (null until they submit).
export async function GET() {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;
  try {
    const app = await findApplicationForOwner(guard);
    return Response.json({ application: vendorView(app) });
  } catch (err) {
    console.error("Failed to load vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

// POST /api/vendor/application → submit (or resubmit) the onboarding wizard.
// Body: { ownerName, phone, gstNumber, fssaiNumber, docIds: { gst?, fssai? } }.
// The listing itself is read from the vendor's SAVED record (the wizard saves a
// draft first), so what the admin reviews is exactly what would go live.
export async function POST(request: Request) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const identity = parseSubmissionIdentity(body);
  if (!identity.ok) {
    return Response.json({ error: identity.error }, { status: 400 });
  }

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json(
        { error: "Save your business details before submitting." },
        { status: 400 },
      );
    }
    const complete = validateSubmission(vendor);
    if (!complete.ok) {
      return Response.json({ error: complete.error }, { status: 400 });
    }

    // KYC files may only be linked by the account that uploaded them, under
    // the document slot they were uploaded for.
    for (const [key, docId] of Object.entries(identity.value.docIds)) {
      const doc = docId ? await getKycDocument(docId) : null;
      if (!doc || doc.ownerUserId !== guard.id || doc.docKey !== key) {
        return Response.json(
          { error: "One of your KYC files couldn't be verified. Please upload it again." },
          { status: 400 },
        );
      }
    }

    const existing = await findApplicationForOwner(guard);
    const record = buildApplication({
      existing,
      id: `VND-${randomUUID().slice(0, 6).toUpperCase()}`,
      vendor,
      identity: identity.value,
      owner: guard,
      now: new Date(),
    });
    await saveVendorApplication(record);

    // New or back-in-queue applications alert the owners (best-effort).
    if (record.status === "Pending") {
      await sendVendorApplicationAlert(record).catch((err) =>
        console.error("Vendor application alert failed", err),
      );
    }

    return Response.json(
      { ok: true, application: vendorView(record) },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error("Failed to submit vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
