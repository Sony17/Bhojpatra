/**
 * Review photos — the images a customer attaches to a rating.
 *
 * Reviews are public, but they share the project's single **private** Vercel
 * Blob store with KYC/vendor documents (that store can't hand out public URLs),
 * so we can't return a raw blob URL to the browser. Same split as
 * `vendorPhotos.ts`: the BYTES go to the private Blob store (or
 * `data/review-photos/` locally when no token is set), the METADATA to
 * Postgres/Neon via `createStore`, and the bytes are served back through the
 * public `GET /api/reviews/photo/[id]` route — a same-origin URL `next/image`
 * can optimize without any remote-pattern config. Each upload mints a fresh id,
 * so a photo URL's content never changes and caches never go stale.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, get } from "@vercel/blob";
import { createStore } from "@/lib/store";
import { PHOTO_ALLOWED_TYPES } from "@/lib/vendorPhotos";

const BLOB_TOKEN =
  (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/vercel_blob_rw_\S+/)?.[0] ??
  undefined;

// Local-dev disk fallback for photo bytes when no Blob token is set (the
// metadata always lives in Postgres). Mirrors vendorPhotos.ts's split.
const REVIEW_PHOTOS_DIR = path.join(process.cwd(), "data", "review-photos");

export interface ReviewPhoto {
  id: string;
  /** File name in the store (never exposed to clients). */
  storedName: string;
  /** Private Blob URL for the bytes; absent for the local-disk fallback. */
  blobUrl?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const store = createStore<ReviewPhoto>({
  table: "review_photos",
  idField: "id",
});

function newReviewPhotoId(): string {
  return `RPH-${randomUUID().slice(0, 12)}`;
}

/** The public, same-origin URL a review photo is served from. */
export function reviewPhotoUrl(photo: ReviewPhoto): string {
  return `/api/reviews/photo/${photo.id}`;
}

export function getReviewPhoto(id: string): Promise<ReviewPhoto | null> {
  return store.get(id);
}

/** Persist the bytes (private Blob in production, disk locally) and their
 *  metadata; returns the stored record. */
export async function saveReviewPhoto(
  bytes: Buffer,
  mimeType: string,
): Promise<ReviewPhoto> {
  const id = newReviewPhotoId();
  const storedName = `${id}.${PHOTO_ALLOWED_TYPES[mimeType]}`;

  let blobUrl: string | undefined;
  if (BLOB_TOKEN) {
    const { url } = await put(`review-photos/${storedName}`, bytes, {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: true,
      token: BLOB_TOKEN,
    });
    blobUrl = url;
  } else {
    await fs.mkdir(REVIEW_PHOTOS_DIR, { recursive: true });
    await fs.writeFile(path.join(REVIEW_PHOTOS_DIR, storedName), bytes);
  }

  const photo: ReviewPhoto = {
    id,
    storedName,
    ...(blobUrl ? { blobUrl } : {}),
    mimeType,
    size: bytes.length,
    uploadedAt: new Date().toISOString(),
  };
  await store.upsert(photo);
  return photo;
}

/** Read a photo's bytes back for the serving handler. */
export async function readReviewPhotoFile(
  photo: ReviewPhoto,
): Promise<BodyInit | null> {
  if (photo.blobUrl) {
    const result = await get(photo.blobUrl, {
      access: "private",
      token: BLOB_TOKEN,
    });
    return result ? result.stream : null;
  }
  try {
    // `basename` defends against path traversal via a tampered store record.
    return await fs.readFile(
      path.join(REVIEW_PHOTOS_DIR, path.basename(photo.storedName)),
    );
  } catch {
    return null;
  }
}
