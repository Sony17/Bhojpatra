/**
 * Storage layer — Neon Postgres in production, JSON files locally.
 *
 * Every record store in the app (bookings, payments, leads, partners, venues,
 * vendor applications, KYC document metadata) used to read/write a JSON array
 * on disk. That works in local dev but NOT on Vercel, whose serverless
 * filesystem is read-only/ephemeral — writes error or vanish on the next
 * request. This module swaps in Neon (Postgres) whenever `DATABASE_URL` is set,
 * and otherwise falls back to the original on-disk JSON so `next dev` keeps
 * working before the database is provisioned.
 *
 * Each store is a single table of the shape `(id, seq, data jsonb, updated_at)`:
 * the full record lives in `data` verbatim, so what the API returns is
 * byte-identical to the old file store. `seq` preserves insertion order (the
 * file stores were append-ordered arrays); callers reverse/sort as they did
 * before.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";

// Extract the Postgres connection string from the env value. We don't just
// trim/validate it because the value is often pasted into a dashboard field
// with surrounding junk — a leading `DATABASE_URL=`, a comment line, or even
// the whole multi-line .env block. A connection string contains no whitespace,
// so this pulls out exactly the first `postgres(ql)://…` token and ignores the
// rest; a value with none degrades to the file fallback instead of throwing.
const DATABASE_URL =
  (process.env.DATABASE_URL ?? "").match(/postgres(?:ql)?:\/\/\S+/i)?.[0] ??
  undefined;

const DB_CONFIGURED = !!DATABASE_URL;

/** True when a usable Postgres connection string is configured (Vercel + Neon).
 *  Falsy locally, or when the URL is missing/malformed → the file fallback
 *  keeps things working. */
export const hasDatabase = DB_CONFIGURED;

// Lazily create the Neon client on first use. Creating it at module load would
// crash the entire build (Next.js evaluates route modules to collect page data)
// if the URL were ever malformed; lazy init keeps importing this module free of
// side effects and confines any connection error to an actual query.
let sqlInitialized = false;
let sqlClient: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> | null {
  if (!sqlInitialized) {
    sqlInitialized = true;
    sqlClient = DB_CONFIGURED ? neon(DATABASE_URL!) : null;
  }
  return sqlClient;
}

// The tables we own. Store table names are interpolated into SQL (they can't be
// bound as parameters), so this whitelist is what keeps that interpolation safe
// — a store may only ever name one of these literals, never external input.
const TABLES = [
  "bookings",
  "payments",
  "leads",
  "partners",
  "venues",
  "vendor_applications",
  "kyc_documents",
  "customers",
  "coupons",
  "campaigns",
  "content_items",
  "enquiries",
  "reviews",
  "users",
  "sessions",
] as const;
type Table = (typeof TABLES)[number];

export interface RecordStore<T> {
  /** Every record, oldest-first (insertion order), like the old file array. */
  list(): Promise<T[]>;
  /** One record by its id-field value, or null. */
  get(id: string): Promise<T | null>;
  /** Insert or replace a single record (idempotent on its id-field). */
  upsert(record: T): Promise<void>;
  /** Insert-or-replace many; used where a route rewrote the whole array after
   *  an in-memory mutation. Faithful because these stores only add/mutate,
   *  never delete. */
  upsertMany(records: T[]): Promise<void>;
  /** Hard-delete a record by its id-field value. Newer stores (coupons, content)
   *  expect a real delete; the older append-only stores can keep soft-deleting
   *  via `upsert` and ignore this. No-op if the id isn't present. */
  remove(id: string): Promise<void>;
}

export function createStore<T>(opts: {
  table: Table;
  /** Absolute path to the JSON file used as the local-dev fallback. */
  file: string;
  /** The field on the record that holds its unique id (e.g. "id", "code"). */
  idField: keyof T & string;
}): RecordStore<T> {
  const { table, file, idField } = opts;
  if (!TABLES.includes(table)) throw new Error(`Unknown store table: ${table}`);
  const keyOf = (r: T) => String((r as Record<string, unknown>)[idField]);

  async function fileRead(): Promise<T[]> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T[];
    } catch {
      return [];
    }
  }
  async function fileWrite(rows: T[]): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");
  }

  async function dbUpsert(record: T): Promise<void> {
    await getSql()!.query(
      `insert into ${table} (id, data) values ($1, $2::jsonb)
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [keyOf(record), JSON.stringify(record)],
    );
  }

  return {
    async list() {
      const sql = getSql();
      if (!sql) return fileRead();
      const rows = await sql.query(`select data from ${table} order by seq asc`);
      return rows.map((r) => (r as { data: T }).data);
    },

    async get(id) {
      const sql = getSql();
      if (!sql) return (await fileRead()).find((r) => keyOf(r) === id) ?? null;
      const rows = await sql.query(
        `select data from ${table} where id = $1`,
        [id],
      );
      return rows.length ? (rows[0].data as T) : null;
    },

    async upsert(record) {
      if (!getSql()) {
        const rows = await fileRead();
        const idx = rows.findIndex((r) => keyOf(r) === keyOf(record));
        if (idx >= 0) rows[idx] = record;
        else rows.push(record);
        return fileWrite(rows);
      }
      await dbUpsert(record);
    },

    async upsertMany(records) {
      if (!records.length) return;
      if (!getSql()) {
        const rows = await fileRead();
        for (const rec of records) {
          const idx = rows.findIndex((r) => keyOf(r) === keyOf(rec));
          if (idx >= 0) rows[idx] = rec;
          else rows.push(rec);
        }
        return fileWrite(rows);
      }
      for (const rec of records) await dbUpsert(rec);
    },

    async remove(id) {
      const sql = getSql();
      if (!sql) {
        const rows = await fileRead();
        const next = rows.filter((r) => keyOf(r) !== id);
        if (next.length !== rows.length) await fileWrite(next);
        return;
      }
      await sql.query(`delete from ${table} where id = $1`, [id]);
    },
  };
}

/**
 * Single-row settings (e.g. the merchant UPI config). Stored in a `settings`
 * key/value table in Postgres, or a plain JSON object file locally.
 */
export async function readSingleton<T>(
  key: string,
  file: string,
): Promise<Partial<T> | null> {
  const sql = getSql();
  if (!sql) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as Partial<T>;
    } catch {
      return null;
    }
  }
  const rows = await sql.query(`select data from settings where key = $1`, [
    key,
  ]);
  return rows.length ? (rows[0].data as Partial<T>) : null;
}

export async function writeSingleton<T>(
  key: string,
  file: string,
  value: T,
): Promise<void> {
  const sql = getSql();
  if (!sql) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
    return;
  }
  await sql.query(
    `insert into settings (key, data) values ($1, $2::jsonb)
     on conflict (key) do update set data = excluded.data, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}
