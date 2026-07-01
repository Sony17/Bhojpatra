/**
 * Vendor application storage.
 *
 * When a caterer completes the public registration wizard
 * (`VendorRegister`), their submission is appended to a JSON store on disk —
 * mirroring the file-based `leads` / `kyc` stores. The admin "Vendor Approvals"
 * console reads these back and flips their status (Pending → Verified /
 * Rejected). The uploaded KYC files themselves live in the separate `kyc` store
 * and are referenced here by id.
 */
import { promises as fs } from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
export const VENDOR_APPLICATIONS_STORE = path.join(
  DATA_DIR,
  "vendor-applications.json",
);

export async function readVendorApplications(): Promise<
  VendorApplicationRecord[]
> {
  try {
    return JSON.parse(
      await fs.readFile(VENDOR_APPLICATIONS_STORE, "utf8"),
    ) as VendorApplicationRecord[];
  } catch {
    // No store yet (or unreadable) — start fresh.
    return [];
  }
}

export async function writeVendorApplications(
  records: VendorApplicationRecord[],
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    VENDOR_APPLICATIONS_STORE,
    JSON.stringify(records, null, 2),
    "utf8",
  );
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
