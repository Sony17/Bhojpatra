/**
 * KYC document storage.
 *
 * Vendor KYC files (GST / FSSAI / ID / Business Proof) split into two parts:
 * the file BYTES go to Vercel Blob (or the local disk when the Blob token is
 * absent), and the METADATA is stored in Postgres/Neon via the shared
 * `createStore` helper. Files are only ever served back through the
 * `/api/vendors/kyc/[id]` handler — the raw blob URL (random, unguessable) is
 * kept on the record and never exposed, so access can be gated later.
 */
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { createStore } from "@/lib/store";

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
  /** File name in the store (never exposed to clients). */
  storedName: string;
  /** Vercel Blob URL for the bytes, when uploaded to Blob. Absent for files
   *  written to the local disk fallback. Never exposed to clients. */
  blobUrl?: string;
  mimeType: string;
  ext: string;
  size: number;
  status: KycVerificationStatus;
  uploadedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
export const KYC_STORE = path.join(DATA_DIR, "kyc-documents.json");
export const KYC_FILES_DIR = path.join(DATA_DIR, "kyc");

const store = createStore<KycDocument>({
  table: "kyc_documents",
  file: KYC_STORE,
  idField: "id",
});

export function readKycDocuments(): Promise<KycDocument[]> {
  return store.list();
}

// Callers mutate the array in place (add on upload, flip status on review) then
// write it back; upsertMany replays those changes. KYC records are never
// deleted, so this stays faithful to the old whole-array rewrite.
export function writeKycDocuments(docs: KycDocument[]): Promise<void> {
  return store.upsertMany(docs);
}

/**
 * Persist the uploaded file bytes. Uses Vercel Blob when its token is
 * configured (production), otherwise the local disk fallback. Returns the Blob
 * URL to record (or `undefined` for the disk fallback).
 */
export async function storeKycFile(
  storedName: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | undefined> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Random suffix → the URL is unguessable; we never expose it (served via
    // the /api/vendors/kyc/[id] handler), so the bytes stay effectively private.
    const { url } = await put(`kyc/${storedName}`, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return url;
  }
  await fs.mkdir(KYC_FILES_DIR, { recursive: true });
  await fs.writeFile(path.join(KYC_FILES_DIR, storedName), bytes);
  return undefined;
}

/**
 * Read a stored KYC file back for the review handler. Fetches from Blob when
 * the record carries a `blobUrl`, otherwise reads the local disk fallback.
 * Returns the raw bytes, or `null` if the file is gone.
 */
export async function readKycFile(
  doc: KycDocument,
): Promise<ArrayBuffer | Buffer | null> {
  if (doc.blobUrl) {
    const res = await fetch(doc.blobUrl);
    if (!res.ok) return null;
    return res.arrayBuffer();
  }
  try {
    // Only ever read the recorded file name — `basename` defends against any
    // path-traversal sneaking in through a tampered store.
    return await fs.readFile(path.join(KYC_FILES_DIR, path.basename(doc.storedName)));
  } catch {
    return null;
  }
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
