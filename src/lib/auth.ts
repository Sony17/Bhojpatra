/**
 * Auth mechanics — password hashing, server-side sessions and route guards.
 *
 * SERVER-ONLY. Never import this from a client component (it uses `next/headers`
 * and Node `crypto`). Client code reads the session via `GET /api/auth/session`.
 *
 * - Passwords: Node built-in `scrypt` (no external dependency), stored as
 *   `scrypt$N$r$p$salt$key` and verified in constant time.
 * - Sessions: an opaque token persisted in the `sessions` store, handed to the
 *   browser as a signed (HMAC) HTTP-only cookie. The signature is checked
 *   cheaply in `proxy.ts`; the authoritative check (`getSessionUser`) also
 *   verifies the token exists and hasn't expired.
 */
import {
  scrypt,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  createHash,
} from "crypto";
import { cookies } from "next/headers";
import { createStore } from "@/lib/store";
import {
  SESSION_COOKIE,
  getSessionSecret,
  signToken,
  verifyCookieValue,
} from "@/lib/cookieSign";
import {
  findUserByEmail,
  getUserById,
  saveUser,
  toPublicUser,
  newUserId,
  type PublicUser,
  type UserRecord,
  type UserRole,
} from "@/lib/users";

const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export { SESSION_COOKIE, verifyCookieValue };

/* ── Password hashing (scrypt) ───────────────────────────────────────────── */

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;

function scryptAsync(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pw, salt, KEYLEN, { N, r, p }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt);
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  const key = await scryptAsync(pw, salt);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/* ── Session store + cookie signing ──────────────────────────────────────── */

interface SessionRecord {
  id: string; // SHA-256 derived session token hash
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string; // ISO
}

const sessionStore = createStore<SessionRecord>({
  table: "sessions",
  idField: "id",
});

/** Deterministic one-way hash for session tokens stored in the database. */
export function hashSessionToken(token: string): string {
  return createHash("sha256")
    .update(`session:${token}:${getSessionSecret()}`)
    .digest("hex");
}

/** Create a session for a user and set the signed cookie. */
export async function createSession(user: UserRecord): Promise<void> {
  const token = randomUUID();
  const hashedId = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await sessionStore.upsert({
    id: hashedId,
    userId: user.id,
    role: user.role,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${signToken(token)}`, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clear the current session (delete the row + cookie). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = verifyCookieValue(store.get(SESSION_COOKIE)?.value);
  if (token) await sessionStore.remove(hashSessionToken(token));
  store.delete(SESSION_COOKIE);
}

/** Invalidate every active session belonging to a user (e.g. after password reset). */
export async function destroyUserSessions(userId: string): Promise<void> {
  const sessions = await sessionStore.list();
  const userSessions = sessions.filter((s) => s.userId === userId);
  for (const session of userSessions) {
    await sessionStore.remove(session.id);
  }
}

/** Authoritative check: resolve the current signed-in user, or null. Verifies
 *  the cookie signature, the session row and its expiry. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = verifyCookieValue(store.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const hashedId = hashSessionToken(token);
  const session = await sessionStore.get(hashedId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await sessionStore.remove(hashedId);
    return null;
  }
  const user = await getUserById(session.userId);
  return user ? toPublicUser(user) : null;
}

/** Guard for admin/role-restricted routes. Returns the user, or a Response to
 *  short-circuit with (401 unauthenticated / 403 wrong role). */
export async function requireRole(
  ...roles: UserRole[]
): Promise<PublicUser | Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  // A person can hold several accounts at once, so authorise against the full
  // set (customer/vendor/partner) plus the primary role — not `role` alone.
  // "admin" only ever lives on `role`, keeping the admin console gated.
  const held = new Set<UserRole>([user.role, ...user.accounts]);
  if (roles.length && !roles.some((r) => held.has(r))) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  return user;
}

/* ── Password-reset tokens ───────────────────────────────────────────────── */

export function makeResetToken(): { token: string; hash: string } {
  const token = randomUUID();
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${getSessionSecret()}`)
    .digest("hex");
}

/* ── Admin bootstrap ─────────────────────────────────────────────────────── */

/**
 * Ensure a single admin user exists, seeded from the environment. `ADMIN_EMAIL`
 * plus a pre-computed `ADMIN_PASSWORD_HASH` (scrypt) — the plaintext password is
 * NEVER shipped. In dev, if only a plaintext `ADMIN_PASSWORD` is provided we
 * hash it on the fly (convenience only). No-op once the admin exists.
 */
export async function seedAdminIfMissing(): Promise<void> {
  // Bootstrap admin. In production it MUST come from the environment; in dev we
  // fall back to a default so the admin console is reachable with no setup.
  const email =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
    (IS_PROD ? "" : "admin@bhojpatra.local");
  if (!email) return;
  if (await findUserByEmail(email)) return;

  let passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!passwordHash) {
    const plain = process.env.ADMIN_PASSWORD || (IS_PROD ? "" : "admin123");
    if (plain && !IS_PROD) {
      console.warn(
        `[auth] Seeding a DEV admin (${email} / ${plain}). Set ADMIN_EMAIL + ADMIN_PASSWORD_HASH for production.`,
      );
    }
    if (plain && !IS_PROD) passwordHash = await hashPassword(plain);
  }
  if (!passwordHash) return; // nothing to seed with

  const admin: UserRecord = {
    id: newUserId(),
    email,
    name: "Admin",
    role: "admin",
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await saveUser(admin);
}
