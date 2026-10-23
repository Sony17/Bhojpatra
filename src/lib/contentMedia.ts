/**
 * CMS images (home page, Company pages, stall tiles), stored apart from the
 * content.
 *
 * Each uploaded image is its own `settings` row (`media:<sha256>`) — Postgres,
 * so it works on every host and instance with no blob service — and the
 * content holds only its short, content-hashed URL
 * `/api/content/media/m/<hash>`, served as immutably-cached bytes.
 *
 * Legacy content still carries base64 `data:image/…` URIs inline (megabytes).
 * Until an admin save moves them out (`extractInlineImages` on PUT), reads swap
 * them for `/api/content/media/<scope>/<hash>` URLs (`externalizeImages`) and
 * the PUT maps those back (`internalizeImages`) so nothing is ever lost.
 */
import { createHash } from "node:crypto";
import { readSingleton, writeSingleton } from "@/lib/store";

export type MediaScope = "home" | "site" | "stalls";

/** Settings-store key holding each scope's content. */
export const MEDIA_SCOPE_KEYS: Record<MediaScope, string> = {
  home: "home-content",
  site: "site-content",
  stalls: "stall-tile-images",
};

const DATA_IMAGE = /^data:image\/[a-z0-9.+-]+;base64,/i;

/** Raster types accepted for stored images (no SVG — it can carry script). */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
/** Decoded-size cap per image (the admin picker downscales to ≤2000px first). */
export const MEDIA_MAX_BYTES = 4 * 1024 * 1024;
const STORED_PREFIX = "/api/content/media/m/";

interface StoredMedia {
  type: string;
  /** Base64 bytes. */
  data: string;
}

function hashOf(dataUri: string): string {
  return createHash("sha1").update(dataUri).digest("hex").slice(0, 20);
}

function mediaUrl(scope: MediaScope, dataUri: string): string {
  return `/api/content/media/${scope}/${hashOf(dataUri)}`;
}

/** Deep-map every string in a JSON-shaped value. */
function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn);
    return out as T;
  }
  return value;
}

/** Collect every inline image in `value`, keyed by its URL hash. */
function indexInline(value: unknown): Map<string, string> {
  const index = new Map<string, string>();
  mapStrings(value, (s) => {
    if (DATA_IMAGE.test(s)) index.set(hashOf(s), s);
    return s;
  });
  return index;
}

/** Outgoing: replace inline images with their media URLs. */
export function externalizeImages<T>(content: T, scope: MediaScope): T {
  return mapStrings(content, (s) => (DATA_IMAGE.test(s) ? mediaUrl(scope, s) : s));
}

/** Incoming (admin save): resolve media URLs back to the stored data URIs.
 *  Unknown hashes are left as-is (a stale URL just 404s, like any bad link). */
export function internalizeImages<T>(
  content: T,
  stored: unknown,
  scope: MediaScope,
): T {
  const prefix = `/api/content/media/${scope}/`;
  const index = indexInline(stored);
  return mapStrings(content, (s) =>
    s.startsWith(prefix) ? (index.get(s.slice(prefix.length)) ?? s) : s,
  );
}

/** Persist one `data:image/…` URI as its own row and return its URL. Same
 *  bytes → same hash → same row, so re-saving is idempotent. */
export async function storeImage(dataUri: string): Promise<string> {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUri);
  if (!match || !ALLOWED_TYPES.has(match[1].toLowerCase())) {
    throw new Error("Unsupported image type.");
  }
  const type = match[1].toLowerCase();
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MEDIA_MAX_BYTES) {
    throw new Error("Image is empty or too large.");
  }
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  await writeSingleton<StoredMedia>(`media:${hash}`, {
    type,
    data: bytes.toString("base64"),
  });
  return `${STORED_PREFIX}${hash}`;
}

/** Admin save: move every inline image out of the content into its own row. */
export async function extractInlineImages<T>(content: T): Promise<T> {
  const uris = new Set<string>();
  mapStrings(content, (s) => {
    if (DATA_IMAGE.test(s)) uris.add(s);
    return s;
  });
  const urls = new Map<string, string>();
  for (const uri of uris) urls.set(uri, await storeImage(uri));
  return mapStrings(content, (s) => urls.get(s) ?? s);
}

/** A stored image's bytes by hash, for the media route. */
export async function readStoredImage(
  hash: string,
): Promise<{ type: string; bytes: Buffer } | null> {
  if (!/^[0-9a-f]{32}$/.test(hash)) return null;
  const row = await readSingleton<StoredMedia>(`media:${hash}`);
  if (!row?.type || !row.data) return null;
  return { type: row.type, bytes: Buffer.from(row.data, "base64") };
}

/** Find one inline image by hash and decode it, for the media route. */
export function findInlineImage(
  stored: unknown,
  hash: string,
): { type: string; bytes: Buffer } | null {
  const uri = indexInline(stored).get(hash);
  if (!uri) return null;
  const comma = uri.indexOf(",");
  const type = uri.slice(5, uri.indexOf(";"));
  return { type, bytes: Buffer.from(uri.slice(comma + 1), "base64") };
}
