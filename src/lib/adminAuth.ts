/**
 * Mock client-side admin auth for the demo.
 *
 * There's no auth backend yet, so admin access is gated by a single hard-coded
 * credential and a flag persisted in localStorage. This mirrors the customer/
 * vendor mock in `session.ts` but is kept separate so admin access can't be
 * granted by the public signup flow.
 */

import { useEffect, useState } from "react";

/** The one admin account for the demo. */
const ADMIN_EMAIL = "ankit23690@gmail.com";
const ADMIN_PASSWORD = "admin123";

const KEY = "bhojpatra.admin";
const ADMIN_EVENT = "bhojpatra:admin";

export interface AdminSession {
  email: string;
}

function notifyChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_EVENT));
}

/**
 * Validate credentials. Returns the session on success, or `null` if the email
 * or password doesn't match. Comparison is case-insensitive on the email.
 */
export function verifyAdmin(email: string, password: string): AdminSession | null {
  const ok =
    email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  return ok ? { email: ADMIN_EMAIL } : null;
}

export function setAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    notifyChange();
  } catch {
    /* storage unavailable (private mode) — ignore for the mock */
  }
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    return typeof parsed?.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    notifyChange();
  } catch {
    /* ignore */
  }
}

/**
 * Reactive read of the admin session for client components. Returns `undefined`
 * while loading (server + first client render), then `null` (signed out) or the
 * stored session, re-reading whenever it changes in this tab or another.
 */
export function useAdminSession(): AdminSession | null | undefined {
  const [session, setSession] = useState<AdminSession | null | undefined>(
    undefined
  );

  useEffect(() => {
    const sync = () => setSession(getAdminSession());
    sync();
    window.addEventListener(ADMIN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ADMIN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
