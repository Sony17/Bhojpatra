"use client";

/**
 * Client-side view of the **real** signed-in session.
 *
 * Identity now lives in a signed, HTTP-only cookie backed by the `users` /
 * `sessions` tables (see `lib/auth.ts`); this module is just the client access
 * layer that reads it via `GET /api/auth/session` and shapes the `PublicUser`
 * into the `MockSession` the header, dashboards and referral views already
 * consume. There is no localStorage copy — the cookie is the single source of
 * truth. Login / signup set the cookie server-side and then call
 * `refreshSession()`; `logout()` clears it via `POST /api/auth/logout`.
 *
 * A module-level cache is shared across every component so the session is
 * fetched once and every subscriber re-renders when it changes.
 */

import { useEffect, useState } from "react";

export type AccountType = "customer" | "vendor" | "partner";

/** Referral-partner sub-type chosen at signup. */
export type PartnerRole = "planner" | "individual" | "venue";

/**
 * A single partner role the account holds, with its own referral code. One
 * person can be all three (Event Planner + Individual Referrer + Venue Owner);
 * each role earns against its own code and gets its own dashboard view.
 */
export interface PartnerMembership {
  type: PartnerRole;
  referralCode: string;
}

export interface MockSession {
  type: AccountType;
  name?: string;
  /**
   * Set for partner accounts — the primary/first referrer type. Kept for
   * backward compatibility; prefer `partnerRoles` (this is derivable from it).
   */
  partnerType?: PartnerRole;
  /** Set for partner accounts — the primary/first referral code. */
  referralCode?: string;
  /**
   * Every partner role this account holds, each with its own referral code.
   * Lets one person hold all three roles and switch between their dashboards.
   */
  partnerRoles?: PartnerMembership[];
}

/** The client-safe user shape returned by `/api/auth/session`. */
interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: AccountType | "admin";
  partnerRoles?: PartnerMembership[];
}

/** Where each account type lands after auth. */
export const DASHBOARD_PATH: Record<AccountType, string> = {
  customer: "/bookings",
  vendor: "/vendor/dashboard",
  partner: "/partner/dashboard",
};

/** Shape the authenticated user into the session the app consumes. Admins have
 *  their own console (`adminAuth`) and aren't a booking `AccountType`, so they
 *  read as "signed out" here. */
function toSession(user: SessionUser | null): MockSession | null {
  if (!user) return null;
  if (user.role !== "customer" && user.role !== "vendor" && user.role !== "partner") {
    return null;
  }
  const roles = user.partnerRoles ?? [];
  return {
    type: user.role,
    name: user.name,
    partnerType: roles[0]?.type,
    referralCode: roles[0]?.referralCode,
    partnerRoles: roles.length ? roles : undefined,
  };
}

/* ── Shared session cache (fetch once, notify all subscribers) ────────────── */

// `undefined` = not loaded yet (loading); `null` = signed out; object = signed in.
let cache: MockSession | null | undefined = undefined;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

async function load(): Promise<void> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as
      | { user?: SessionUser | null }
      | null;
    cache = toSession((res.ok && json?.user) || null);
  } catch {
    cache = null;
  }
  emit();
}

/** Kick off the first load if it hasn't happened yet. */
function ensureLoaded(): void {
  if (cache !== undefined || inflight) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

/** Re-fetch the session from the server (after login / signup / role change)
 *  and notify every subscriber. */
export function refreshSession(): Promise<void> {
  const p = load();
  inflight = p.finally(() => {
    inflight = null;
  });
  return p;
}

/** End the session: clear the server cookie, then refresh (→ signed out). */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  await refreshSession();
}

/** Dashboard path for an account type (defaults to the customer view). */
export function dashboardPath(type?: AccountType): string {
  return DASHBOARD_PATH[type ?? "customer"];
}

/**
 * All partner roles the account holds. Reads the `partnerRoles` array when
 * present, otherwise derives a single membership from the legacy
 * `partnerType`/`referralCode` fields so older sessions keep working.
 */
export function partnerMemberships(
  session: MockSession | null,
): PartnerMembership[] {
  if (!session) return [];
  if (session.partnerRoles?.length) return session.partnerRoles;
  if (session.partnerType && session.referralCode) {
    return [{ type: session.partnerType, referralCode: session.referralCode }];
  }
  return [];
}

/**
 * Attach an additional partner role (with its freshly minted referral code) to
 * the current account. Persists it to the user's record server-side, then
 * refreshes the session so the new role's dashboard is available. No-ops on a
 * duplicate role (the server dedupes by type).
 */
export async function addPartnerRole(
  membership: PartnerMembership,
): Promise<void> {
  await fetch("/api/auth/partner-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(membership),
  }).catch(() => {});
  await refreshSession();
}

/**
 * Reactive read of the current session for client components. Returns `null`
 * on the server and first client render (avoids hydration mismatch), then the
 * signed-in session once `/api/auth/session` resolves, and re-reads whenever it
 * changes (login / logout / role change in this tab).
 */
export function useSession(): MockSession | null {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return cache === undefined ? null : cache;
}

/**
 * Like `useSession`, but distinguishes "still loading" (`undefined`, before the
 * session resolves) from "signed out" (`null`). Dashboard guards use this
 * tri-state so they can wait during load instead of bouncing a signed-in user
 * to /login on the first render.
 */
export function useSessionStatus(): MockSession | null | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return cache;
}
