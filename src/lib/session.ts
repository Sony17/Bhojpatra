/**
 * Mock client-side session for the demo.
 *
 * There's no auth backend yet — we persist the chosen account type (and name)
 * in localStorage so the app can route a signed-in user to the right
 * dashboard: customers → /bookings, vendors → /vendor/dashboard.
 */

import { useEffect, useState } from "react";

export type AccountType = "customer" | "vendor";

export interface MockSession {
  type: AccountType;
  name?: string;
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
    if (parsed.type === "customer" || parsed.type === "vendor") return parsed;
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
