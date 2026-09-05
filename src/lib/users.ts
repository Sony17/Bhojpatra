/**
 * User store — the real auth backend that replaces the localStorage-only mock
 * in `session.ts` / `adminAuth.ts`.
 *
 * Users persist to Postgres (Neon) or a local JSON file via `createStore`. The
 * scrypt password hash lives inside the record and is NEVER returned by any API
 * — every projection goes through `toPublicUser`. Passwords are hashed and
 * verified in `auth.ts`.
 */
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type { AccountType, PartnerMembership } from "@/lib/session";

export type UserRole = "customer" | "vendor" | "partner" | "admin";

export interface UserRecord {
  id: string;
  /** Lowercased, unique — the login handle. */
  email: string;
  name?: string;
  /**
   * The account's single role. One email holds exactly one role — customer,
   * vendor OR referral partner — and gets that role's one dashboard; roles are
   * never combined on a login. Admins are the exception: `role === "admin"` is
   * a separate console and never a booking account.
   */
  role: UserRole;
  /**
   * LEGACY — the old multi-account model let one login hold several account
   * types at once. Kept only so pre-existing records still parse; new code
   * never writes it, and `accountsFor` collapses it to the one effective role.
   */
  accounts?: AccountType[];
  /** scrypt hash, format `scrypt$N$r$p$salt$key`. Never exposed. */
  passwordHash: string;
  /** The partner role + referral code, when this account is a partner. One
   *  membership per account; extra legacy entries are ignored on read. */
  partnerRoles?: PartnerMembership[];
  /** The user's saved UI language preference (follows them across devices). */
  lang?: "en" | "hi";
  createdAt: string;
  /** Password-reset flow: hashed token + expiry. Never exposed. */
  resetTokenHash?: string;
  resetExpires?: string;
}

/** The client-safe shape returned by every auth endpoint. */
export interface PublicUser {
  id: string;
  email: string;
  name?: string;
  /** The single effective role (see `effectiveRole`). */
  role: UserRole;
  /** Exactly one entry — the effective role. Kept as an array only because the
   *  client session and guards already consume this shape. Empty for admins. */
  accounts: AccountType[];
  partnerRoles?: PartnerMembership[];
  lang?: "en" | "hi";
}

/**
 * The ONE account type this record resolves to. One email ↔ one role.
 *
 * Legacy records from the old multi-account model may carry extra types in
 * `accounts`/`partnerRoles`; they collapse deterministically:
 *   - a record whose `role` is vendor or partner keeps that role (it's what
 *     the account was built around);
 *   - a "customer" record that was later granted a business account keeps the
 *     business role — vendor first, then partner — since that was a deliberate
 *     upgrade and carries listings/referral codes;
 *   - everyone else is a customer. Admins resolve to null (separate console).
 */
export function effectiveRole(u: UserRecord): AccountType | null {
  if (u.role === "admin") return null;
  if (u.role === "vendor" || u.role === "partner") return u.role;
  const legacy = u.accounts ?? [];
  if (legacy.includes("vendor")) return "vendor";
  if (legacy.includes("partner") || (u.partnerRoles?.length ?? 0) > 0)
    return "partner";
  return "customer";
}

/** The account set a person holds — always exactly one type now (one email ↔
 *  one role), or empty for admins. Kept array-shaped for the existing guards. */
export function accountsFor(u: UserRecord): AccountType[] {
  const role = effectiveRole(u);
  return role ? [role] : [];
}


const store = createStore<UserRecord>({
  table: "users",
  idField: "id",
});

export function newUserId(): string {
  return `USR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function isUserRole(v: unknown): v is UserRole {
  return v === "customer" || v === "vendor" || v === "partner" || v === "admin";
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const key = email.trim().toLowerCase();
  const users = await store.list();
  return users.find((u) => u.email === key) ?? null;
}

export function getUserById(id: string): Promise<UserRecord | null> {
  return store.get(id);
}

export function saveUser(user: UserRecord): Promise<void> {
  return store.upsert(user);
}

/** Strip everything the client must never see (password + reset material).
 *  Reports the collapsed single role, and a partner's one membership — never
 *  the legacy multi-role extras. */
export function toPublicUser(u: UserRecord): PublicUser {
  const accounts = accountsFor(u);
  const role: UserRole = u.role === "admin" ? "admin" : (accounts[0] ?? "customer");
  const membership = role === "partner" ? u.partnerRoles?.[0] : undefined;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    accounts,
    ...(membership ? { partnerRoles: [membership] } : {}),
    ...(u.lang ? { lang: u.lang } : {}),
  };
}
