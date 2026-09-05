/**
 * Enquiry documents — the menu & budget PDF a guest attaches to a
 * custom-package (curated catering) WhatsApp enquiry from the homepage.
 *
 * METADATA rides in the existing `vendor_photos` table under its own
 * `kind: "enquiry"` (the venue-photo precedent — no new DDL to apply to the
 * live DB). Ids are prefixed `EDOC-` and every read checks the kind, so the two
 * record families can never be read through each other's routes.
 *
 * BYTES have two homes, tried in order:
 *   1. The project's private Vercel Blob store — preferred, and used
 *      automatically whenever it is healthy.
 *   2. Postgres/Neon, base64 in a `settings` row keyed `enquiry-doc:<id>`.
 *      The Blob store is currently SUSPENDED (`put()` throws "This store has
 *      been suspended"), which 500'd every upload. Postgres is the app's
 *      required, healthy store, so it is the fallback — durable across
 *      redeploys and on read-only serverless filesystems, unlike a disk path.
 *      `settings` is addressed only ever by key (nothing lists it), so parking
 *      a few document rows there costs no other query anything; a record store
 *      like `vendor_photos` would drag the bytes into every `list()`.
 * Legacy records may still point at `data/enquiry-docs/` from before the
 * fallback existed, so that disk path is still read (never written).
 *
 * Either way the bytes are served back through the public
 * `GET /api/leads/enquiry-doc/[id]` route — the same-origin URL pasted into the
 * WhatsApp message so the admin can open the PDF straight from the chat.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, get } from "@vercel/blob";
import { createStore, readSingleton, writeSingleton } from "@/lib/store";

const BLOB_TOKEN =
  (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/vercel_blob_rw_\S+/)?.[0] ??
  undefined;

// Read-only legacy location for bytes written before the Postgres fallback.
const ENQUIRY_DOCS_DIR = path.join(process.cwd(), "data", "enquiry-docs");

/** 5 MB — matches the photo cap. Base64 in Postgres is ~4/3 of this, which is
 *  a comfortable row size; a bigger cap would bloat the `settings` row. */
export const ENQUIRY_DOC_MAX_BYTES = 5 * 1024 * 1024;

/** Key under which one document's base64 bytes live in `settings`. */
const bytesKey = (id: string) => `enquiry-doc:${id}`;

export interface EnquiryDoc {
  id: string;
  /** Sentinel owner — enquiry uploads are anonymous, pre-login guests. */
  ownerUserId: "enquiry";
  kind: "enquiry";
  /** File name in the store (never exposed to clients). */
  storedName: string;
  /** The guest's own file name, sanitised — shown in Content-Disposition. */
  fileName: string;
  /** Private Blob URL for the bytes, when the Blob store accepted them. */
  blobUrl?: string;
  /** True when the bytes live in Postgres (`settings`) instead of Blob. */
  inline?: boolean;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const store = createStore<EnquiryDoc>({
  table: "vendor_photos",
  idField: "id",
});

/** The PDF header may legally sit anywhere in the first 1 KB. */
export function looksLikePdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 1024).includes("%PDF-");
}

/** Keep only header-safe characters and cap the length. */
function sanitizeFileName(raw: string): string {
  const cleaned = raw.replace(/[^\w .()-]+/g, "_").slice(0, 80).trim();
  return cleaned || "menu-budget.pdf";
}

/** The public, same-origin URL an enquiry document is served from. */
export function enquiryDocUrl(doc: EnquiryDoc): string {
  return `/api/leads/enquiry-doc/${doc.id}`;
}

export async function getEnquiryDoc(id: string): Promise<EnquiryDoc | null> {
  const doc = await store.get(id);
  // The table is shared with vendor photos — only serve our own records.
  return doc && doc.kind === "enquiry" ? doc : null;
}

/** Persist the bytes (Blob when healthy, else Postgres) and their metadata;
 *  returns the stored record. */
export async function saveEnquiryDoc(
  bytes: Buffer,
  fileName: string,
): Promise<EnquiryDoc> {
  const id = `EDOC-${randomUUID().slice(0, 12)}`;
  const storedName = `${id}.pdf`;

  let blobUrl: string | undefined;
  if (BLOB_TOKEN) {
    try {
      const uploaded = await put(`enquiry-docs/${storedName}`, bytes, {
        access: "private",
        contentType: "application/pdf",
        addRandomSuffix: true,
        token: BLOB_TOKEN,
      });
      blobUrl = uploaded.url;
    } catch (err) {
      // A suspended/over-quota store must not fail the enquiry — fall through
      // to Postgres. Logged so the underlying Blob problem stays visible.
      console.warn(
        "Blob store unavailable for enquiry document; storing in Postgres.",
        err,
      );
    }
  }
  if (!blobUrl) await writeSingleton(bytesKey(id), { base64: bytes.toString("base64") });

  const doc: EnquiryDoc = {
    id,
    ownerUserId: "enquiry",
    kind: "enquiry",
    storedName,
    fileName: sanitizeFileName(fileName),
    ...(blobUrl ? { blobUrl } : { inline: true }),
    mimeType: "application/pdf",
    size: bytes.length,
    uploadedAt: new Date().toISOString(),
  };
  await store.upsert(doc);
  return doc;
}

/** Read a document's bytes back for the serving handler. */
export async function readEnquiryDocFile(
  doc: EnquiryDoc,
): Promise<BodyInit | null> {
  if (doc.blobUrl) {
    const result = await get(doc.blobUrl, {
      access: "private",
      token: BLOB_TOKEN,
    });
    return result ? result.stream : null;
  }
  if (doc.inline) {
    const row = await readSingleton<{ base64: string }>(bytesKey(doc.id));
    return row?.base64 ? Buffer.from(row.base64, "base64") : null;
  }
  try {
    // Legacy disk records. `basename` defends against path traversal via a
    // tampered store record.
    return await fs.readFile(
      path.join(ENQUIRY_DOCS_DIR, path.basename(doc.storedName)),
    );
  } catch {
    return null;
  }
}
