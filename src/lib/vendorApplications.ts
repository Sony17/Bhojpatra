/**
 * Vendor application storage.
 *
 * When a signed-in vendor submits the onboarding wizard (`/vendor/register` →
 * POST /api/vendor/application) ONE application is upserted for their account
 * (keyed by `ownerUserId`; legacy rows by email) and persisted to Postgres via
 * the shared `createStore` helper. The admin "Vendor Approvals" console reads
 * these back and records its decision (Pending → Verified / Rejected, or
 * Rejected with `changesRequested`). A resubmission after a rejection moves the
 * same record back to Pending. The uploaded KYC files live in the separate
 * `kyc` store and are referenced here by id.
 */
import { createStore } from "@/lib/store";
import type {
  VendorApplication,
  VendorApplicationEvent,
  VendorDocKind,
  VendorTier,
  VerificationStatus,
} from "@/lib/admin/types";
import type {
  CutleryTierOption,
  SingleStallConfig,
  VendorBadgesState,
  VendorBainaBox,
  VendorBainaDetails,
  VendorCustomOffering,
  VendorDietaryOffering,
  VendorEssentialService,
} from "@/lib/vendorMenus";

export interface VendorPackageInput {
  name: string;
  dishes: string;
  price: string;
}

export interface VendorApplicationDoc {
  kind: VendorDocKind;
  number: string;
  status: VerificationStatus;
  /** Id of the uploaded file in the KYC store (`/api/vendors/kyc/<id>`). */
  docId?: string;
}

/** The full record as persisted on disk. The admin console sees the projection
 *  returned by {@link toAdminApplication}. */
export interface VendorApplicationRecord {
  id: string;
  /** The vendor account that submitted it. Absent on legacy public-form rows,
   *  which are matched by `email` instead. */
  ownerUserId?: string;
  business: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  cuisines: string[];
  speciality: string;
  /** Price-derived baseline (what their package prices qualify for). Immutable. */
  requestedTiers: VendorTier[];
  /** Admin's explicit tier decision during review. Overrides the baseline and
   *  drives the vendor's public badges once set. */
  assignedTiers?: VendorTier[];
  gstNumber: string;
  fssaiNumber: string;
  /** Vendor-declared Google rating (0–5) + review count imported at
   *  registration. Carried onto the live vendor record (prefilled into the
   *  dashboard menu editor) so it surfaces as a "Google" badge on the card. */
  googleRating?: number;
  googleReviews?: number;
  documents: VendorApplicationDoc[];
  packages: VendorPackageInput[];
  minGuests: string;
  maxGuests: string;
  /** Max events the caterer can cater in a single day. */
  maxEventsPerDay: string;
  serviceCities: string[];
  counters: string[];
  /** Catering categories the vendor serves (`cateringCategories` ids) — the
   *  same offering types customers browse on the frontend. Absent on
   *  applications submitted before the field existed. */
  cateringCategories?: string[];
  /** Baina Box menu declared at registration (baina-box category) — prefills
   *  the dashboard menu builder. */
  bainaBoxes?: VendorBainaBox[];
  /** Essential Service offer declared at registration (essential category). */
  essentialService?: VendorEssentialService;

  /* ── V2 Extensions ── */
  dietaryOffering?: VendorDietaryOffering;
  minPax?: number;
  leadHours?: number;
  bestFor?: string[];
  packageName?: string;
  goldSpecialization?: string;
  cutleryTier?: CutleryTierOption;
  customOfferings?: VendorCustomOffering[];
  stallConfig?: SingleStallConfig;
  bainaDetails?: VendorBainaDetails;
  badges?: VendorBadgesState;
  cateringComponents?: import("@/lib/vendorMenus").CateringComponentsSelection;

  status: VerificationStatus;
  /** Set with status "Rejected" when the admin asked for fixes (the vendor can
   *  edit and resubmit) rather than turning the vendor down. */
  changesRequested?: boolean;
  /** The admin's note to the vendor on the last reject / changes request. */
  reviewReason?: string;
  /** Display date (YYYY-MM-DD) shown in the approvals table. */
  submitted: string;
  submittedAt: string;
  reviewedAt?: string;
  /** Email of the admin who made the last decision. */
  reviewedBy?: string;
  /** Audit trail, newest last (capped at {@link MAX_HISTORY}). */
  history?: VendorApplicationEvent[];
}

export const MAX_HISTORY = 30;

/** Append an audit event, keeping only the most recent {@link MAX_HISTORY}. */
export function withHistory(
  r: VendorApplicationRecord,
  event: VendorApplicationEvent,
): VendorApplicationEvent[] {
  return [...(r.history ?? []), event].slice(-MAX_HISTORY);
}
const store = createStore<VendorApplicationRecord>({
  table: "vendor_applications",
  idField: "id",
});

export function readVendorApplications(): Promise<VendorApplicationRecord[]> {
  return store.list();
}

/** One application by id (single-row read). */
export function getVendorApplication(
  id: string,
): Promise<VendorApplicationRecord | null> {
  return store.get(id);
}

/** Insert or replace ONE application — never rewrite the whole table (a
 *  read-all/write-all round trip loses concurrent reviews). */
export function saveVendorApplication(
  record: VendorApplicationRecord,
): Promise<void> {
  return store.upsert(record);
}

/** The application belonging to a vendor account: matched by `ownerUserId`,
 *  falling back to the login email for legacy rows that predate the field
 *  (only when that row isn't bound to a different account). */
export function applicationForOwner(
  apps: VendorApplicationRecord[],
  owner: { id: string; email: string },
): VendorApplicationRecord | null {
  const byOwner = apps.find((a) => a.ownerUserId === owner.id);
  if (byOwner) return byOwner;
  const email = owner.email.trim().toLowerCase();
  return (
    apps.find(
      (a) => !a.ownerUserId && a.email.trim().toLowerCase() === email,
    ) ?? null
  );
}

/** Store-backed {@link applicationForOwner}. */
export async function findApplicationForOwner(owner: {
  id: string;
  email: string;
}): Promise<VendorApplicationRecord | null> {
  return applicationForOwner(await readVendorApplications(), owner);
}

// Callers mutate the array in place then write it back; upsertMany replays
// those adds/edits (these records are never deleted, so this stays faithful).
export function writeVendorApplications(
  records: VendorApplicationRecord[],
): Promise<void> {
  return store.upsertMany(records);
}

/** Hard-delete an application (admin archive). The referenced KYC files stay in
 *  their own store. */
export function removeVendorApplication(id: string): Promise<void> {
  return store.remove(id);
}

/** Project a stored record onto the admin `VendorApplication` shape consumed by
 *  the approvals console (drops the menu / coverage fields it doesn't show). */
export function toAdminApplication(
  r: VendorApplicationRecord,
): VendorApplication {
  return {
    id: r.id,
    business: r.business,
    owner: r.owner,
    city: r.city,
    speciality: r.speciality,
    requestedTiers: r.requestedTiers,
    assignedTiers: r.assignedTiers,
    submitted: r.submitted,
    status: r.status,
    email: r.email,
    phone: r.phone,
    documents: r.documents.map((d) => ({
      kind: d.kind,
      number: d.number,
      status: d.status,
      ...(d.docId ? { fileUrl: `/api/vendors/kyc/${d.docId}` } : {}),
    })),
    ...(r.changesRequested ? { changesRequested: true } : {}),
    ...(r.reviewReason ? { reviewReason: r.reviewReason } : {}),
    ...(r.reviewedBy ? { reviewedBy: r.reviewedBy } : {}),
    ...(r.reviewedAt ? { reviewedAt: r.reviewedAt } : {}),
    ...(r.history?.length ? { history: r.history } : {}),
  };
}
