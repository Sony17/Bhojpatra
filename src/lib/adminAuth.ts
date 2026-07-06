/**
 * Admin auth — thin client wrapper over the real auth backend.
 *
 * There are no hard-coded credentials any more. Sign-in goes through
 * `POST /api/auth/login`, which sets a signed, HTTP-only session cookie and
 * (for an admin) is mirrored into a small localStorage flag so the admin shell
 * can gate its UI synchronously. The cookie is the source of truth — the flag
 * is re-synced from `GET /api/auth/session` on mount so an expired/again-signed-
 * out session clears the UI too.
 */

import { useEffect, useState } from "react";

const KEY = "bhojpatra.admin";
const ADMIN_EVENT = "bhojpatra:admin";

export interface AdminSession {
  email: string;
}

function notifyChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_EVENT));
}

export function setAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    notifyChange();
  } catch {
    /* storage unavailable (private mode) — ignore */
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
 * Sign in as admin. POSTs to the auth backend; only an account with the `admin`
 * role is accepted here (a customer/vendor logging in on this page is rejected
 * so the public signup flow can never reach the admin console). On success the
 * server sets the session cookie and we mirror the email locally.
 */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as
      | { user?: { email: string; role: string }; error?: string }
      | null;
    if (!res.ok || !json?.user) {
      return { ok: false, error: json?.error ?? "Invalid email or password." };
    }
    if (json.user.role !== "admin") {
      // Log them straight back out — this isn't an admin account.
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      return { ok: false, error: "This account can't access the admin panel." };
    }
    setAdminSession({ email: json.user.email });
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't sign in. Please try again." };
  }
}

export async function logoutAdmin(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  clearAdminSession();
}

/**
 * Reactive read of the admin session. Returns `undefined` while loading (server
 * + first client render), then `null` (signed out) or the session. Re-syncs
 * from the server session cookie on mount so a stale localStorage flag can't
 * outlive the real session.
 */
export function useAdminSession(): AdminSession | null | undefined {
  const [session, setSession] = useState<AdminSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const sync = () => setSession(getAdminSession());
    sync();

    // Reconcile with the authoritative server session.
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active) return;
        const user = json?.user as { email: string; role: string } | null;
        if (user?.role === "admin") setAdminSession({ email: user.email });
        else clearAdminSession();
      })
      .catch(() => {
        /* offline — keep the cached flag */
      });

    window.addEventListener(ADMIN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener(ADMIN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
