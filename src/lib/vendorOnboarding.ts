/**
 * Vendor onboarding → application submission rules (pure, no I/O).
 *
 * The V2 wizard (`/vendor/register`) saves drafts to the vendor's own catalog
 * record (PUT /api/vendor/menu — lenient, half-filled forms are fine). The
 * final "Submit" posts here-validated identity/KYC details to
 * POST /api/vendor/application, which checks the SAVED listing is complete
 * ({@link validateSubmission}) and upserts the single application bound to the
 * vendor's account ({@link buildApplication}). Kept free of store imports so
 * the rules are unit-testable (`vendorOnboarding.test.ts`).
 */
import {
  isValidAadhaar,
  isValidGst,
  isValidPan,
  normalizeAadhaar,
  normalizeGst,
  normalizePan,
  normalizePhone,
  panOfGstin,
  PHONE_RE,
} from "@/lib/validate";
import { effectiveTiers } from "@/lib/tiers";
import {
  hasBankDetails,
  parsePayoutAccount,
  payoutDocNumber,
  type VendorPayoutAccount,
} from "@/lib/payoutAccount";
import type { VendorApplicationEvent } from "@/lib/admin/types";
import {
  withHistory,
  type VendorApplicationDoc,
  type VendorApplicationRecord,
} from "@/lib/vendorApplications";
import type { LiveVendorRecord, OnboardingDocKey } from "@/lib/vendorMenus";

/** FSSAI licence numbers are exactly 14 digits. */
export const FSSAI_RE = /^\d{14}$/;

/** Identity + KYC details captured by wizard steps 1–2. */
export interface SubmissionIdentity {
  ownerName: string;
  phone: string;
  /** GSTIN — or "" when the vendor identifies with PAN + Aadhaar instead. */
  gstNumber: string;
  /** Business PAN ("" when a GSTIN alone was given) — must be the PAN the
   *  GSTIN was issued against when both are present. */
  panNumber: string;
  /** Owner's 12-digit Aadhaar, "" when a GSTIN alone was given (stored on the
   *  application for admin review; customers only see the last four digits). */
  aadhaarNumber: string;
  fssaiNumber: string;
  /** Where advances and settlements are paid out — all optional; undefined
   *  when the vendor left the payout card empty. */
  payout?: VendorPayoutAccount;
  /** Uploaded KYC file ids by document (ownership is checked by the route). */
  docIds: Partial<Record<OnboardingDocKey, string>>;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max = 120) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Parse + strictly validate the identity/KYC part of a submission body. */
export function parseSubmissionIdentity(
  body: Record<string, unknown>,
): Result<SubmissionIdentity> {
  const ownerName = str(body.ownerName, 80);
  if (ownerName.length < 2) {
    return { ok: false, error: "Owner name is required." };
  }
  const phone = normalizePhone(str(body.phone, 20));
  if (!PHONE_RE.test(phone)) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }
  // Tax identity: a GSTIN, OR a PAN together with the owner's Aadhaar (a
  // vendor below the GST threshold has no GSTIN). Any number given must be
  // valid, and a PAN given beside a GSTIN must be the one inside it.
  const gstNumber = normalizeGst(str(body.gstNumber, 20));
  if (gstNumber && !isValidGst(gstNumber)) {
    return { ok: false, error: "Please enter a valid 15-character GSTIN." };
  }
  const panNumber = normalizePan(str(body.panNumber, 20));
  if (panNumber && !isValidPan(panNumber)) {
    return { ok: false, error: "Please enter a valid 10-character PAN." };
  }
  if (gstNumber && panNumber && panOfGstin(gstNumber) !== panNumber) {
    return { ok: false, error: "Your PAN must match the PAN inside your GSTIN." };
  }
  const aadhaarNumber = normalizeAadhaar(str(body.aadhaarNumber, 20));
  if (aadhaarNumber && !isValidAadhaar(aadhaarNumber)) {
    return { ok: false, error: "Please enter a valid 12-digit Aadhaar number." };
  }
  if (!gstNumber && !(panNumber && aadhaarNumber)) {
    return {
      ok: false,
      error: "Enter your GSTIN, or your PAN and Aadhaar number.",
    };
  }
  const fssaiNumber = str(body.fssaiNumber, 20).replace(/\s/g, "");
  if (!FSSAI_RE.test(fssaiNumber)) {
    return { ok: false, error: "FSSAI licence must be exactly 14 digits." };
  }
  const payout = parsePayoutAccount(body.payout);
  if (!payout.ok) return payout;
  const rawDocs = (body.docIds ?? {}) as Record<string, unknown>;
  const docIds: SubmissionIdentity["docIds"] = {};
  for (const key of ["gst", "pan", "aadhaar", "fssai", "cheque", "upiQr"] as const) {
    const id = str(rawDocs[key], 24);
    if (id) docIds[key] = id;
  }
  return {
    ok: true,
    value: {
      ownerName,
      phone,
      gstNumber,
      panNumber,
      aadhaarNumber,
      fssaiNumber,
      payout: payout.value,
      docIds,
    },
  };
}

/** The saved listing must be complete enough to review before it can be
 *  submitted — the server-side twin of the wizard's per-step checks (drafts
 *  stay lenient; this runs only on Submit). */
export function validateSubmission(vendor: LiveVendorRecord): Result<true> {
  if (!vendor.business || vendor.business.trim().length < 2) {
    return { ok: false, error: "Add your registered business name." };
  }
  if (!vendor.city?.trim()) {
    return { ok: false, error: "Add your primary kitchen city." };
  }
  if (!vendor.dietaryOffering) {
    return { ok: false, error: "Select your kitchen's dietary offering." };
  }
  const services = vendor.serviceCategories ?? [];
  if (!services.length) {
    return { ok: false, error: "Select at least one service you offer." };
  }
  if (services.includes("full-catering") && !(vendor.priceFrom > 0)) {
    return { ok: false, error: "Set your Silver per-plate rate for Feast Booking." };
  }
  if (
    services.includes("single-stall") &&
    !vendor.stallConfig?.categories?.length
  ) {
    return { ok: false, error: "Add at least one stall to your Single Stall setup." };
  }
  if (services.includes("baina-box") && !vendor.bainaBoxes?.length) {
    return { ok: false, error: "Add at least one Baina Box to your catalog." };
  }
  return { ok: true, value: true };
}

/** Lifecycle stage of an application, as the vendor sees it. */
export type VendorApplicationStage =
  | "not-submitted"
  | "pending"
  | "verified"
  | "changes-requested"
  | "rejected";

export function applicationStage(
  app: Pick<VendorApplicationRecord, "status" | "changesRequested"> | null | undefined,
): VendorApplicationStage {
  if (!app) return "not-submitted";
  if (app.status === "Verified") return "verified";
  if (app.status === "Rejected") {
    return app.changesRequested ? "changes-requested" : "rejected";
  }
  return "pending";
}

/** The statutory documents the wizard owns, in review order. */
const WIZARD_DOC_KINDS = ["GST", "PAN", "Aadhaar", "FSSAI", "Bank Account", "UPI"] as const;

/** Merge the GST / PAN / Aadhaar / FSSAI / bank-account / UPI documents: a doc whose number and file are unchanged
 *  keeps its review status (an admin's Rejected stays Rejected until the vendor
 *  actually replaces it); anything new or changed goes back to Pending.
 *  Legacy documents (ID / Business Proof) carry over untouched. */
function mergeDocuments(
  existing: VendorApplicationDoc[],
  identity: SubmissionIdentity,
): { documents: VendorApplicationDoc[]; changed: boolean } {
  let changed = false;
  const next = (
    kind: (typeof WIZARD_DOC_KINDS)[number],
    number: string,
    docId: string | undefined,
  ): VendorApplicationDoc => {
    const prev = existing.find((d) => d.kind === kind);
    const same =
      prev && prev.number === number && (prev.docId ?? "") === (docId ?? "");
    if (!same) changed = true;
    return {
      kind,
      number,
      status: same ? prev!.status : "Pending",
      ...(docId ? { docId } : {}),
    };
  };
  // GST / PAN / Aadhaar are either-or — a number left blank drops its
  // document (and counts as a change when one was on file).
  const optional = (
    kind: "GST" | "PAN" | "Aadhaar",
    number: string,
    docId: string | undefined,
  ): VendorApplicationDoc[] => {
    if (number) return [next(kind, number, docId)];
    if (existing.some((d) => d.kind === kind)) changed = true;
    return [];
  };
  const documents = [
    ...optional("GST", identity.gstNumber, identity.docIds.gst),
    ...optional("PAN", identity.panNumber, identity.docIds.pan),
    ...optional("Aadhaar", identity.aadhaarNumber, identity.docIds.aadhaar),
    next("FSSAI", identity.fssaiNumber, identity.docIds.fssai),
    // Payout documents exist only for what the vendor gave (all optional).
    ...(hasBankDetails(identity.payout)
      ? [next("Bank Account", payoutDocNumber(identity.payout!), identity.docIds.cheque)]
      : []),
    ...(identity.payout?.upiId || identity.docIds.upiQr
      ? [next("UPI", identity.payout?.upiId || "QR code", identity.docIds.upiQr)]
      : []),
    ...existing.filter(
      (d) => !(WIZARD_DOC_KINDS as readonly string[]).includes(d.kind),
    ),
  ];
  return { documents, changed };
}

/**
 * Create or update the vendor's ONE application from their saved listing plus
 * the submitted identity/KYC details.
 *
 *   • New → Pending ("submitted").
 *   • Pending / Rejected / Changes requested → Pending again ("resubmitted"),
 *     clearing the last decision's reason (it stays in `history`).
 *   • Verified → stays Verified (the vendor is live); changed KYC documents
 *     drop back to Pending for the admin to re-check.
 */
export function buildApplication(opts: {
  existing: VendorApplicationRecord | null;
  id: string;
  vendor: LiveVendorRecord;
  identity: SubmissionIdentity;
  owner: { id: string; email: string };
  now: Date;
}): VendorApplicationRecord {
  const { existing, id, vendor, identity, owner, now } = opts;
  const iso = now.toISOString();
  const previous = existing ?? null;
  const { documents, changed } = mergeDocuments(existing?.documents ?? [], identity);
  const verified = existing?.status === "Verified";
  const event: VendorApplicationEvent = {
    at: iso,
    by: "vendor",
    action: existing ? "resubmitted" : "submitted",
    ...(verified && changed ? { note: "KYC details changed" } : {}),
  };

  return {
    // Admin-owned decisions (assigned tiers, review trail) carry over.
    ...(existing ?? {}),
    id: existing?.id ?? id,
    ownerUserId: owner.id,
    business: vendor.business,
    owner: identity.ownerName,
    email: owner.email.trim().toLowerCase(),
    phone: identity.phone,
    city: vendor.city,
    state: vendor.state,
    cuisines: vendor.cuisines,
    speciality:
      vendor.goldSpecialization || vendor.cuisines.slice(0, 2).join(", ") || "Catering",
    requestedTiers: effectiveTiers(vendor.tiers, vendor.priceFrom),
    gstNumber: identity.gstNumber,
    ...(identity.panNumber ? { panNumber: identity.panNumber } : {}),
    fssaiNumber: identity.fssaiNumber,
    payoutAccount: identity.payout,
    upiQrDocId: identity.docIds.upiQr,
    ...(vendor.googleRating ? { googleRating: vendor.googleRating } : {}),
    ...(vendor.googleReviews !== undefined ? { googleReviews: vendor.googleReviews } : {}),
    documents,
    packages: existing?.packages ?? [],
    minGuests: vendor.minPax ? String(vendor.minPax) : (existing?.minGuests ?? ""),
    maxGuests: vendor.maxCapacity ? String(vendor.maxCapacity) : (existing?.maxGuests ?? ""),
    maxEventsPerDay: vendor.maxEventsPerDay
      ? String(vendor.maxEventsPerDay)
      : (existing?.maxEventsPerDay ?? ""),
    serviceCities: vendor.serviceCities ?? [],
    counters: (vendor.counters ?? []).map((c) => c.id),
    cateringCategories: vendor.serviceCategories ?? [],
    bainaBoxes: vendor.bainaBoxes,
    essentialService: vendor.essentialService,
    dietaryOffering: vendor.dietaryOffering,
    minPax: vendor.minPax,
    leadHours: vendor.leadHours,
    bestFor: vendor.bestFor,
    packageName: vendor.packageName,
    goldSpecialization: vendor.goldSpecialization,
    cutleryTier: vendor.cutleryTier,
    customOfferings: vendor.customOfferings,
    stallConfig: vendor.stallConfig,
    bainaDetails: vendor.bainaDetails,
    // Badge state is server-held on the vendor record (grants are admin-only).
    badges: vendor.badges,
    cateringComponents: vendor.cateringComponents,
    status: verified ? "Verified" : "Pending",
    changesRequested: undefined,
    reviewReason: verified ? existing?.reviewReason : undefined,
    submitted: iso.slice(0, 10),
    submittedAt: iso,
    // A verified vendor re-saving identical KYC isn't news — only a real
    // change (or any resubmission while not yet verified) is logged.
    history: previous
      ? verified && !changed
        ? previous.history
        : withHistory(previous, event)
      : [event],
  };
}
