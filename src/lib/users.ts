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
   * The account's *primary* type — the one it first signed up as, kept for the
   * session record and post-login default. Access is no longer gated on this
   * single value; the full set of account types the person holds lives in
   * `accounts` (see `accountsFor`). Admins are the exception: `role === "admin"`
   * is a separate console and never a booking account.
   */
  role: UserRole;
  /**
   * Every account type this one person holds — customer (universal), vendor
   * and/or referral partner. One human can be all three; the merged dashboard
   * and the route guards read this, not `role`. Persisted so it survives a
   * device change. Absent on legacy records → derived from `role`/`partnerRoles`
   * by `accountsFor`.
   */
  accounts?: AccountType[];
  /** scrypt hash, format `scrypt$N$r$p$salt$key`. Never exposed. */
  passwordHash: string;
  /** Partner roles + referral codes, when the account holds the partner type. */
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
  role: UserRole;
  /** Every account type this person holds (see `UserRecord.accounts`). */
  accounts: AccountType[];
  partnerRoles?: PartnerMembership[];
  lang?: "en" | "hi";
}

/** Stable display/order for account types: customer, then vendor, then partner. */
const ACCOUNT_ORDER: AccountType[] = ["customer", "vendor", "partner"];

function orderAccounts(set: Set<AccountType>): AccountType[] {
  return ACCOUNT_ORDER.filter((a) => set.has(a));
}

/**
 * The full set of account types a person holds, in stable order. Customer is
 * universal — every non-admin user can always book — so it's always present;
 * vendor and referral partner are add-ons. Reads the explicit `accounts` array
 * when present and unions it with the types implied by `role`/`partnerRoles`, so
 * both new multi-account records and legacy single-role records resolve
 * correctly. Admins aren't a booking account, so they get an empty set.
 */
export function accountsFor(u: UserRecord): AccountType[] {
  if (u.role === "admin") return [];
  const set = new Set<AccountType>(["customer"]);
  for (const a of u.accounts ?? []) set.add(a);
  if (u.role === "vendor") set.add("vendor");
  if (u.role === "partner" || (u.partnerRoles?.length ?? 0) > 0) set.add("partner");
  return orderAccounts(set);
}

/**
 * Grant an additional account type to a user record (mutates in place). Unions
 * the new type with everything the person already holds and re-materialises the
 * explicit `accounts` array so it stays complete. No-op for admins.
 */
export function grantAccount(u: UserRecord, type: AccountType): void {
  if (u.role === "admin") return;
  const set = new Set<AccountType>(accountsFor(u));
  set.add(type);
  u.accounts = orderAccounts(set);
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

/** Strip everything the client must never see (password + reset material). */
export function toPublicUser(u: UserRecord): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    accounts: accountsFor(u),
    ...(u.partnerRoles ? { partnerRoles: u.partnerRoles } : {}),
    ...(u.lang ? { lang: u.lang } : {}),
  };
}
