/**
 * Storage layer — Neon Postgres. The database is REQUIRED.
 *
 * Every record store in the app (bookings, payments, leads, partners, venues,
 * vendor applications, KYC document metadata, users, sessions, CMS content, …)
 * reads and writes Postgres via this module. There is NO file fallback: if no
 * connection string is configured the first query throws a clear error rather
 * than silently persisting to an ephemeral disk (which 500s on Vercel's
 * read-only serverless filesystem anyway).
 *
 * Each store is a single table of the shape `(id, seq, data jsonb, updated_at)`:
 * the full record lives in `data` verbatim. `seq` preserves insertion order;
 * callers reverse/sort as needed.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon/Postgres connection string. Vercel's Neon integration provisions the
// same database under several env var names (`DATABASE_URL`, `POSTGRES_URL`,
// the *_UNPOOLED / *_NON_POOLING direct-connection variants, etc.), and which
// ones exist can differ per environment. So we accept any of the known names,
// preferring the pooled connection string the serverless HTTP driver wants.
//
// Each value is matched with a regex rather than used verbatim because it's
// often pasted with surrounding junk (a leading `DATABASE_URL=`, a comment
// line, or even a whole multi-line .env block). A connection string contains no
// whitespace, so this pulls out exactly the first `postgres(ql)://…` token; a
// var with none is skipped.
const DB_URL_ENV_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;
const DATABASE_URL = DB_URL_ENV_VARS.reduce<string | undefined>(
  (found, name) =>
    found ?? (process.env[name] ?? "").match(/postgres(?:ql)?:\/\/\S+/i)?.[0],
  undefined,
);

// Lazily create the Neon client on first use. Creating it at module load would
// crash the build (Next.js evaluates route modules to collect page data);
// lazy init keeps importing this module side-effect free and confines the
// "database required" error to an actual query.
let sqlClient: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    if (!DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is required — set a Neon/Postgres connection string " +
          "(DATABASE_URL or POSTGRES_URL). There is no file fallback.",
      );
    }
    sqlClient = neon(DATABASE_URL);
  }
  return sqlClient;
}

// Neon's serverless database autosuspends when idle, so the first query after a
// lull can hit a cold connection and fail once. Since there's no file fallback,
// that single blip would otherwise 500 the request (e.g. a support-callback that
// then shows "Couldn't send your request"). A short backoff-and-retry turns the
// transient hiccup into a success. All our operations are idempotent
// (upsert/delete/select), so re-running a query is always safe.
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("terminated") ||
    msg.includes("socket") ||
    msg.includes("network") ||
    msg.includes("connection")
  );
}

async function runQuery(
  text: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await getSql().query(text, params)) as Record<string, unknown>[];
    } catch (err) {
      lastErr = err;
      if (attempt === 2 || !isTransient(err)) throw err;
      // 150ms, then 300ms — enough for a Neon cold-start to settle.
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// The tables we own. Store table names are interpolated into SQL (they can't be
// bound as parameters), so this whitelist is what keeps that interpolation safe
// — a store may only ever name one of these literals, never external input.
const TABLES = [
  "bookings",
  "payments",
  "refunds",
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
  "vendors",
  "vendor_photos",
  "review_photos",
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
   *  an in-memory mutation. */
  upsertMany(records: T[]): Promise<void>;
  /** Hard-delete a record by its id-field value. No-op if the id isn't present. */
  remove(id: string): Promise<void>;
}

export function createStore<T>(opts: {
  table: Table;
  /** The field on the record that holds its unique id (e.g. "id", "code"). */
  idField: keyof T & string;
}): RecordStore<T> {
  const { table, idField } = opts;
  if (!TABLES.includes(table)) throw new Error(`Unknown store table: ${table}`);
  const keyOf = (r: T) => String((r as Record<string, unknown>)[idField]);

  async function dbUpsert(record: T): Promise<void> {
    await runQuery(
      `insert into ${table} (id, data) values ($1, $2::jsonb)
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [keyOf(record), JSON.stringify(record)],
    );
  }

  return {
    async list() {
      const rows = await runQuery(
        `select data from ${table} order by seq asc`,
      );
      return rows.map((r) => (r as { data: T }).data);
    },

    async get(id) {
      const rows = await runQuery(
        `select data from ${table} where id = $1`,
        [id],
      );
      return rows.length ? (rows[0].data as T) : null;
    },

    async upsert(record) {
      await dbUpsert(record);
    },

    async upsertMany(records) {
      if (!records.length) return;
      for (const rec of records) await dbUpsert(rec);
    },

    async remove(id) {
      await runQuery(`delete from ${table} where id = $1`, [id]);
    },
  };
}

/**
 * Single-row settings (e.g. the merchant UPI config, the CMS content blobs).
 * Stored in a `settings` key/value table in Postgres.
 */
export async function readSingleton<T>(
  key: string,
): Promise<Partial<T> | null> {
  const rows = await runQuery(
    `select data from settings where key = $1`,
    [key],
  );
  return rows.length ? (rows[0].data as Partial<T>) : null;
}

export async function writeSingleton<T>(key: string, value: T): Promise<void> {
  await runQuery(
    `insert into settings (key, data) values ($1, $2::jsonb)
     on conflict (key) do update set data = excluded.data, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

/** Delete a singleton so the next read falls back to its default. No-op if the
 *  key isn't present. Used by CMS "reset to defaults" actions. */
export async function deleteSingleton(key: string): Promise<void> {
  await runQuery(`delete from settings where key = $1`, [key]);
}
