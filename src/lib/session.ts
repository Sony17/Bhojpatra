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
 * The one partner role an account holds, with its referral code. One email ↔
 * one role: a partner account is exactly one of Event Planner, Individual
 * Referrer or Venue Owner.
 */
export interface PartnerMembership {
  type: PartnerRole;
  referralCode: string;
}

export interface MockSession {
  /**
   * The account's single role. One email holds exactly one role — customer,
   * vendor OR partner — and gets that role's one dashboard.
   */
  type: AccountType;
  /**
   * The account set, always exactly one entry (`type`). Kept array-shaped
   * because the route guards and views consume it that way.
   */
  accounts: AccountType[];
  name?: string;
  /** The account's login email — lets authenticated flows (e.g. the vendor
   *  registration wizard) bind to the signed-in account instead of re-asking. */
  email?: string;
  /** Set for partner accounts — the partner lane (planner/individual/venue). */
  partnerType?: PartnerRole;
  /** Set for partner accounts — the referral code. */
  referralCode?: string;
  /** The partner membership, as a one-entry array (legacy shape). */
  partnerRoles?: PartnerMembership[];
}

/** The client-safe user shape returned by `/api/auth/session`. */
interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: AccountType | "admin";
  accounts?: AccountType[];
  partnerRoles?: PartnerMembership[];
}

/** The dashboard router — forwards each signed-in user to the one dashboard
 *  their role owns (see `/dashboard/page.tsx`). */
export const DASHBOARD_HOME_PATH = "/dashboard";

/** Where each account type's *dedicated* dashboard lives. */
export const DASHBOARD_PATH: Record<AccountType, string> = {
  customer: "/bookings",
  vendor: "/vendor/dashboard",
  partner: "/partner/dashboard",
};

/** Human labels for each account type. */
export const ACCOUNT_LABEL: Record<AccountType, { en: string; hi: string }> = {
  customer: { en: "Customer", hi: "ग्राहक" },
  vendor: { en: "Vendor", hi: "वेंडर" },
  partner: { en: "Partner", hi: "पार्टनर" },
};

/** Shape the authenticated user into the session the app consumes. Admins have
 *  their own console (`adminAuth`) and aren't a booking `AccountType`, so they
 *  read as "signed out" here. */
function toSession(user: SessionUser | null): MockSession | null {
  if (!user) return null;
  if (user.role !== "customer" && user.role !== "vendor" && user.role !== "partner") {
    return null;
  }
  // One email ↔ one role: the server reports the single effective role. The
  // account set is always exactly that one type.
  const membership = user.partnerRoles?.[0];
  return {
    type: user.role,
    accounts: [user.role],
    name: user.name,
    email: user.email,
    partnerType: membership?.type,
    referralCode: membership?.referralCode,
    partnerRoles: membership ? [membership] : undefined,
  };
}

/** Does this session hold the given account type? */
export function hasAccount(
  session: MockSession | null,
  type: AccountType,
): boolean {
  return !!session?.accounts.includes(type);
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
 * The partner membership the account holds (empty for non-partners). Reads the
 * `partnerRoles` array when present, otherwise derives the membership from the
 * legacy `partnerType`/`referralCode` fields so older sessions keep working.
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
