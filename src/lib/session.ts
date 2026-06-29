/**
 * Mock client-side session for the demo.
 *
 * There's no auth backend yet — we persist the chosen account type (and name)
 * in localStorage so the app can route a signed-in user to the right
 * dashboard: customers → /bookings, vendors → /vendor/dashboard.
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

const KEY = "bhojpatra.session";

/**
 * Same-tab storage changes don't fire the native `storage` event, so we emit
 * our own event whenever the session changes. Components subscribe via
 * `useSession()` to re-render (e.g. the header swapping Log In for the account
 * menu the moment a user signs in or out).
 */
const SESSION_EVENT = "bhojpatra:session";

function notifySessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Where each account type lands after auth. */
export const DASHBOARD_PATH: Record<AccountType, string> = {
  customer: "/bookings",
  vendor: "/vendor/dashboard",
  partner: "/partner/dashboard",
};

export function setSession(session: MockSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    notifySessionChange();
  } catch {
    /* storage unavailable (private mode) — ignore for the mock */
  }
}

export function getSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockSession;
    if (
      parsed.type === "customer" ||
      parsed.type === "vendor" ||
      parsed.type === "partner"
    )
      return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    notifySessionChange();
  } catch {
    /* ignore */
  }
}

/** Dashboard path for the current session, defaulting to the customer view. */
export function dashboardPath(type?: AccountType): string {
  const resolved = type ?? getSession()?.type ?? "customer";
  return DASHBOARD_PATH[resolved];
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
 * the current account and persist it. No-ops on a missing/duplicate role.
 * Returns the updated session, or `null` if there's no session to attach to.
 */
export function addPartnerRole(
  membership: PartnerMembership,
): MockSession | null {
  const existing = getSession();
  if (!existing) return null;
  const roles = partnerMemberships(existing);
  if (roles.some((r) => r.type === membership.type)) return existing;
  const next: MockSession = {
    ...existing,
    type: "partner",
    partnerType: existing.partnerType ?? membership.type,
    referralCode: existing.referralCode ?? membership.referralCode,
    partnerRoles: [...roles, membership],
  };
  setSession(next);
  return next;
}

/**
 * Reactive read of the current session for client components. Returns `null`
 * on the server and first client render (avoids hydration mismatch), then the
 * stored session, and re-reads whenever it changes — in this tab (our custom
 * event) or another tab (the native `storage` event).
 */
export function useSession(): MockSession | null {
  const [session, setSessionState] = useState<MockSession | null>(null);

  useEffect(() => {
    const sync = () => setSessionState(getSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}

/**
 * Like `useSession`, but distinguishes "still loading" (`undefined`, first
 * render before localStorage is read) from "signed out" (`null`). Dashboard
 * guards use this tri-state so they can wait during load instead of bouncing a
 * signed-in user to /login on the first render.
 */
export function useSessionStatus(): MockSession | null | undefined {
  const [session, setSessionState] = useState<MockSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const sync = () => setSessionState(getSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
