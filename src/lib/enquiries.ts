/**
 * Contact-form enquiry store.
 *
 * The public contact page used to fake a success state and drop the message.
 * Submissions now persist here (Postgres/Neon or local JSON) so a future admin
 * "Enquiries" view can read them back. Same `createStore` idiom as the other
 * stores.
 */
import { randomUUID, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put, get } from "@vercel/blob";
import { createStore } from "@/lib/store";

const BLOB_TOKEN =
  (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/vercel_blob_rw_\S+/)?.[0] ??
  undefined;

export const ENQUIRY_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface EnquiryAttachment {
  id: string;
  originalName: string;
  storedName: string;
  blobUrl?: string;
  mimeType: string;
  size: number;
  /** Cryptographically random share token for scoped WhatsApp recipient access. */
  shareToken: string;
  uploadedAt: string;
}

export interface EnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: "contact-page" | "custom-catering";
  createdAt: string;
  /** Extended details for Custom Catering enquiries */
  eventType?: string;
  eventDate?: string;
  city?: string;
  guests?: number;
  budget?: string;
  attachment?: EnquiryAttachment;
}

const store = createStore<EnquiryRecord>({
  table: "enquiries",
  idField: "id",
});

const DATA_DIR = path.join(process.cwd(), "data");
export const ENQUIRY_FILES_DIR = path.join(DATA_DIR, "enquiries");

export function readEnquiries(): Promise<EnquiryRecord[]> {
  return store.list();
}

export async function getEnquiryById(id: string): Promise<EnquiryRecord | null> {
  return store.get(id);
}

export async function getEnquiryByAttachmentId(
  attachmentId: string,
): Promise<EnquiryRecord | null> {
  const all = await store.list();
  return all.find((e) => e.attachment?.id === attachmentId) ?? null;
}

export function addEnquiry(rec: EnquiryRecord): Promise<void> {
  return store.upsert(rec);
}

export function newEnquiryId(): string {
  return `ENQ-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function newAttachmentId(): string {
  return `ATT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function generateShareToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Validate that buffer starts with '%PDF-' magic bytes.
 */
export function isValidPdfHeader(bytes: Buffer): boolean {
  if (bytes.length < 5) return false;
  return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

/**
 * Persist the uploaded menu/budget PDF bytes. Uses private Vercel Blob store
 * when token is configured, otherwise local disk fallback (data/enquiries/).
 */
export async function storeEnquiryFile(
  storedName: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | undefined> {
  if (BLOB_TOKEN) {
    const { url } = await put(`enquiries/${storedName}`, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
      token: BLOB_TOKEN,
    });
    return url;
  }
  await fs.mkdir(ENQUIRY_FILES_DIR, { recursive: true });
  await fs.writeFile(path.join(ENQUIRY_FILES_DIR, storedName), bytes);
  return undefined;
}

/**
 * Read a stored enquiry attachment file for streaming.
 */
export async function readEnquiryFile(
  attachment: EnquiryAttachment,
): Promise<BodyInit | null> {
  if (attachment.blobUrl) {
    const result = await get(attachment.blobUrl, {
      access: "private",
      token: BLOB_TOKEN,
    });
    return result ? result.stream : null;
  }
  try {
    const safeName = path.basename(attachment.storedName);
    return await fs.readFile(path.join(ENQUIRY_FILES_DIR, safeName));
  } catch {
    return null;
  }
}

