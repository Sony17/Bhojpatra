/**
 * KYC document storage.
 *
 * Vendor KYC files (GST / FSSAI / ID / Business Proof) are written to a
 * runtime store on disk and their metadata appended to a JSON index — mirroring
 * the file-based `leads`/`payments` stores. Files live OUTSIDE `public/` and are
 * only ever served back through the `/api/vendors/kyc/[id]` handler so disk
 * paths never leak and access can be gated later.
 */
import { promises as fs } from "fs";
import path from "path";

/** The four documents collected during vendor registration (Step 2). */
export type KycDocKey = "gst" | "fssai" | "ownerId" | "businessProof";

export const KYC_DOC_KEYS: KycDocKey[] = [
  "gst",
  "fssai",
  "ownerId",
  "businessProof",
];

export const KYC_DOC_LABELS: Record<KycDocKey, string> = {
  gst: "GST Certificate",
  fssai: "FSSAI Licence",
  ownerId: "Owner ID Proof",
  businessProof: "Business Proof",
};

/** Accepted upload formats — PDF, JPG, PNG (matches the on-screen hint). The
 *  value is the canonical extension used for the file on disk. */
export const KYC_ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const KYC_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type KycVerificationStatus = "Pending" | "Verified" | "Rejected";

export interface KycDocument {
  id: string;
  docKey: KycDocKey;
  /** Vendor context captured at upload time (registration Step 1). */
  business: string;
  email: string;
  originalName: string;
  /** File name on disk (never exposed to clients). */
  storedName: string;
  mimeType: string;
  ext: string;
  size: number;
  status: KycVerificationStatus;
  uploadedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
export const KYC_STORE = path.join(DATA_DIR, "kyc-documents.json");
export const KYC_FILES_DIR = path.join(DATA_DIR, "kyc");

export async function readKycDocuments(): Promise<KycDocument[]> {
  try {
    return JSON.parse(await fs.readFile(KYC_STORE, "utf8")) as KycDocument[];
  } catch {
    // No store yet (or unreadable) — start fresh.
    return [];
  }
}

export async function writeKycDocuments(docs: KycDocument[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(KYC_STORE, JSON.stringify(docs, null, 2), "utf8");
}

export function isKycDocKey(value: unknown): value is KycDocKey {
  return (
    typeof value === "string" && (KYC_DOC_KEYS as string[]).includes(value)
  );
}

/** Client-safe projection — exposes a download URL, never the disk path. */
export function publicKycShape(d: KycDocument) {
  return {
    id: d.id,
    docKey: d.docKey,
    business: d.business,
    email: d.email,
    originalName: d.originalName,
    mimeType: d.mimeType,
    size: d.size,
    status: d.status,
    uploadedAt: d.uploadedAt,
    url: `/api/vendors/kyc/${d.id}`,
  };
}
