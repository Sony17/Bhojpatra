/**
 * User store — the real auth backend that replaces the localStorage-only mock
 * in `session.ts` / `adminAuth.ts`.
 *
 * Users persist to Postgres (Neon) or a local JSON file via `createStore`. The
 * scrypt password hash lives inside the record and is NEVER returned by any API
 * — every projection goes through `toPublicUser`. Passwords are hashed and
 * verified in `auth.ts`.
 */
import path from "path";
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type { PartnerMembership } from "@/lib/session";

export type UserRole = "customer" | "vendor" | "partner" | "admin";

export interface UserRecord {
  id: string;
  /** Lowercased, unique — the login handle. */
  email: string;
  name?: string;
  role: UserRole;
  /** scrypt hash, format `scrypt$N$r$p$salt$key`. Never exposed. */
  passwordHash: string;
  /** Partner roles + referral codes, when role === "partner". */
  partnerRoles?: PartnerMembership[];
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
  partnerRoles?: PartnerMembership[];
}

export const USERS_STORE = path.join(process.cwd(), "data", "users.json");

const store = createStore<UserRecord>({
  table: "users",
  file: USERS_STORE,
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
    ...(u.partnerRoles ? { partnerRoles: u.partnerRoles } : {}),
  };
}
