/**
 * Vendor application storage.
 *
 * When a caterer completes the public registration wizard
 * (`VendorRegister`), their submission is persisted to Postgres (Neon), or to a
 * JSON file locally — via the shared `createStore` helper. The admin "Vendor
 * Approvals" console reads these back and flips their status (Pending →
 * Verified / Rejected). The uploaded KYC files themselves live in the separate
 * `kyc` store and are referenced here by id.
 */
import { createStore } from "@/lib/store";
import type {
  VendorApplication,
  VendorDocKind,
  VendorTier,
  VerificationStatus,
} from "@/lib/admin/types";
import type {
  VendorBainaBox,
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
  status: VerificationStatus;
  /** Display date (YYYY-MM-DD) shown in the approvals table. */
  submitted: string;
  submittedAt: string;
  reviewedAt?: string;
}
const store = createStore<VendorApplicationRecord>({
  table: "vendor_applications",
  idField: "id",
});

export function readVendorApplications(): Promise<VendorApplicationRecord[]> {
  return store.list();
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
    })),
  };
}
