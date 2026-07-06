/**
 * Vendor photos — everything customers see for a caterer, in three kinds:
 *   • "card"    — the single card image on wizard/catalog cards (an upload
 *                 replaces the previous one).
 *   • "dish"    — per-dish thumbnails, referenced from menu items; orphans are
 *                 pruned on menu save.
 *   • "gallery" — the photo gallery on the vendor's public detail page
 *                 (capped, individually deletable).
 *
 * Same storage split as KYC documents (`kyc.ts`): the BYTES go to the private
 * Vercel Blob store (or `data/vendor-photos/` locally when the token is
 * absent), the METADATA to Postgres/Neon via `createStore`. Photos are served
 * back through `GET /api/vendor/photo/[id]` — a public, same-origin URL that
 * `next/image` can optimize without any remote-pattern config. Each upload
 * mints a fresh id, so a URL's content never changes and caches never staleness.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, get, del } from "@vercel/blob";
import { createStore } from "@/lib/store";

const BLOB_TOKEN =
  (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/vercel_blob_rw_\S+/)?.[0] ??
  undefined;

/** JPEG / PNG / WebP only — value is the canonical file extension. */
export const PHOTO_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type VendorPhotoKind = "card" | "dish" | "gallery";

export const GALLERY_MAX_PHOTOS = 8;
/** Hard backstop for dish photos (one per dish; 8 sections × 24 dishes). */
export const DISH_MAX_PHOTOS = 192;

export function isPhotoKind(v: unknown): v is VendorPhotoKind {
  return v === "card" || v === "dish" || v === "gallery";
}

export interface VendorPhoto {
  id: string;
  /** Auth user (role "vendor") the photo belongs to. */
  ownerUserId: string;
  /** What the photo is used for; records from before kinds existed are cards. */
  kind?: VendorPhotoKind;
  /** File name in the store (never exposed to clients). */
  storedName: string;
  /** Private Blob URL for the bytes; absent for the local-disk fallback. */
  blobUrl?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
// Local-dev disk fallback for photo bytes when no Blob token is set (the
// metadata always lives in Postgres). Mirrors kyc.ts's split.
export const VENDOR_PHOTOS_DIR = path.join(DATA_DIR, "vendor-photos");

const store = createStore<VendorPhoto>({
  table: "vendor_photos",
  idField: "id",
});

export function newPhotoId(): string {
  return `VPH-${randomUUID().slice(0, 12)}`;
}

/** The public, same-origin URL a photo is served from. */
export function photoUrl(photo: VendorPhoto): string {
  return `/api/vendor/photo/${photo.id}`;
}

export function getVendorPhoto(id: string): Promise<VendorPhoto | null> {
  return store.get(id);
}

/** Effective kind for a record — pre-kind records were all card photos. */
const kindOf = (p: VendorPhoto): VendorPhotoKind => p.kind ?? "card";

/** The vendor's current card photo, or null. */
export async function findPhotoByOwner(
  ownerUserId: string,
): Promise<VendorPhoto | null> {
  const rows = await store.list();
  return (
    rows.find((p) => p.ownerUserId === ownerUserId && kindOf(p) === "card") ??
    null
  );
}

/** All of a vendor's photos of one kind, oldest-first. */
export async function listPhotosByOwner(
  ownerUserId: string,
  kind: VendorPhotoKind,
): Promise<VendorPhoto[]> {
  const rows = await store.list();
  return rows.filter(
    (p) => p.ownerUserId === ownerUserId && kindOf(p) === kind,
  );
}

/** Persist the bytes (private Blob in production, disk locally). Returns the
 *  Blob URL to record, or `undefined` for the disk fallback. */
async function storePhotoFile(
  storedName: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | undefined> {
  if (BLOB_TOKEN) {
    const { url } = await put(`vendor-photos/${storedName}`, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
      token: BLOB_TOKEN,
    });
    return url;
  }
  await fs.mkdir(VENDOR_PHOTOS_DIR, { recursive: true });
  await fs.writeFile(path.join(VENDOR_PHOTOS_DIR, storedName), bytes);
  return undefined;
}

/** Read a photo's bytes back for the serving handler. */
export async function readPhotoFile(
  photo: VendorPhoto,
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
      path.join(VENDOR_PHOTOS_DIR, path.basename(photo.storedName)),
    );
  } catch {
    return null;
  }
}

/** Delete a photo's bytes + metadata record. Best-effort on the bytes. */
export async function deleteVendorPhoto(photo: VendorPhoto): Promise<void> {
  await store.remove(photo.id);
  if (photo.blobUrl && BLOB_TOKEN) {
    await del(photo.blobUrl, { token: BLOB_TOKEN }).catch(() => {});
  } else {
    await fs
      .unlink(path.join(VENDOR_PHOTOS_DIR, path.basename(photo.storedName)))
      .catch(() => {});
  }
}

/** Store a vendor photo: write the bytes, save the metadata. A "card" upload
 *  replaces the previous card so exactly one exists per account; "dish" and
 *  "gallery" append (their caps are enforced by the upload route). */
export async function saveVendorPhoto(
  ownerUserId: string,
  bytes: Buffer,
  mimeType: string,
  kind: VendorPhotoKind = "card",
): Promise<VendorPhoto> {
  const previousCard = kind === "card" ? await findPhotoByOwner(ownerUserId) : null;

  const id = newPhotoId();
  const storedName = `${id}.${PHOTO_ALLOWED_TYPES[mimeType]}`;
  const blobUrl = await storePhotoFile(storedName, bytes, mimeType);
  const photo: VendorPhoto = {
    id,
    ownerUserId,
    kind,
    storedName,
    ...(blobUrl ? { blobUrl } : {}),
    mimeType,
    size: bytes.length,
    uploadedAt: new Date().toISOString(),
  };
  await store.upsert(photo);

  if (previousCard) await deleteVendorPhoto(previousCard);

  return photo;
}

/** Drop dish photos no longer referenced by any menu item — called after a
 *  menu save so removing a dish (or its photo) doesn't leak stored files. */
export async function pruneDishPhotos(
  ownerUserId: string,
  referencedIds: Set<string>,
): Promise<void> {
  const dishes = await listPhotosByOwner(ownerUserId, "dish");
  for (const p of dishes) {
    if (!referencedIds.has(p.id)) await deleteVendorPhoto(p);
  }
}
