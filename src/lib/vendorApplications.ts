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
  requestedTiers: VendorTier[];
  gstNumber: string;
  fssaiNumber: string;
  documents: VendorApplicationDoc[];
  packages: VendorPackageInput[];
  minGuests: string;
  maxGuests: string;
  serviceCities: string[];
  counters: string[];
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
