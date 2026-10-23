/**
 * One-off: move inline base64 images out of the CMS content rows into their
 * own `media:<hash>` rows (see src/lib/contentMedia.ts), leaving only short
 * `/api/content/media/m/<hash>` URLs in the content.
 *
 *   npx tsx scripts/migrate-content-images.ts           # dry run — report only
 *   npx tsx scripts/migrate-content-images.ts --apply   # backup, move, verify
 *
 * --apply first copies each row to `<key>-backup-<date>` (kept if it already
 * exists), then stores every image and reads it back byte-for-byte before the
 * content row is rewritten. Any mismatch aborts with the row untouched.
 * Undo: copy the backup row's data back over `<key>`.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const KEYS = ["home-content", "site-content"];
const DATA_IMAGE = /^data:image\/[a-z0-9.+-]+;base64,/i;
const BACKUP_SUFFIX = `-backup-${new Date().toISOString().slice(0, 10)}`;

function collect(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    if (DATA_IMAGE.test(value)) out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collect(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collect(v, out);
  }
}

function replace(value: unknown, urls: Map<string, string>): unknown {
  if (typeof value === "string") return urls.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => replace(v, urls));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replace(v, urls)]),
    );
  }
  return value;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const { readSingleton, writeSingleton } = await import("../src/lib/store");
  const { storeImage, readStoredImage } = await import("../src/lib/contentMedia");

  console.log(apply ? "APPLY run" : "DRY run (pass --apply to write)");
  for (const key of KEYS) {
    const stored = await readSingleton<Record<string, unknown>>(key);
    if (!stored) {
      console.log(`\n${key}: no row — skipped`);
      continue;
    }
    const uris = new Set<string>();
    collect(stored, uris);
    const before = JSON.stringify(stored).length;
    console.log(`\n${key}: ${(before / 1024).toFixed(0)} KB, ${uris.size} inline image(s)`);
    for (const uri of uris) {
      console.log(`  - ${uri.slice(5, uri.indexOf(";"))}, ${(uri.length / 1024).toFixed(0)} KB`);
    }
    if (!apply || uris.size === 0) continue;

    const backupKey = key + BACKUP_SUFFIX;
    if (await readSingleton(backupKey)) {
      console.log(`  backup ${backupKey} already exists — kept`);
    } else {
      await writeSingleton(backupKey, stored);
      const check = await readSingleton(backupKey);
      if (JSON.stringify(check).length !== before) {
        throw new Error(`Backup ${backupKey} did not read back intact — aborting.`);
      }
      console.log(`  backup written: ${backupKey}`);
    }

    const urls = new Map<string, string>();
    for (const uri of uris) {
      const url = await storeImage(uri);
      const hash = url.slice(url.lastIndexOf("/") + 1);
      const back = await readStoredImage(hash);
      const original = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
      if (!back || !back.bytes.equals(original)) {
        throw new Error(`Image ${hash} did not read back intact — aborting, ${key} untouched.`);
      }
      urls.set(uri, url);
    }
    console.log(`  ${urls.size} image row(s) stored and verified`);

    const next = replace(stored, urls) as Record<string, unknown>;
    await writeSingleton(key, next);
    const after = await readSingleton<Record<string, unknown>>(key);
    const left = new Set<string>();
    collect(after, left);
    console.log(
      `  ${key} rewritten: ${(before / 1024).toFixed(0)} KB → ${(JSON.stringify(after).length / 1024).toFixed(0)} KB, ${left.size} inline left`,
    );
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
