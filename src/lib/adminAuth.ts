"use client";

/**
 * Admin auth — a thin client view over the real auth backend.
 *
 * There is no localStorage flag any more: the signed, HTTP-only session cookie
 * (backed by the `users` / `sessions` tables) is the single source of truth.
 * Sign-in goes through `POST /api/auth/login`; this module reads the resulting
 * session via `GET /api/auth/session` and exposes it to the admin shell. A
 * module-level cache is shared across components and reset on every full page
 * load, so a stale flag can never outlive the real session.
 */

import { useEffect, useState } from "react";

export interface AdminSession {
  email: string;
}

interface SessionUser {
  email: string;
  role: string;
}

/* ── Shared admin-session cache (fetch once, notify all subscribers) ───────── */

// `undefined` = not loaded yet; `null` = not an admin; object = signed-in admin.
let cache: AdminSession | null | undefined = undefined;
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
    const user = (res.ok && json?.user) || null;
    cache = user && user.role === "admin" ? { email: user.email } : null;
  } catch {
    cache = null;
  }
  emit();
}

function ensureLoaded(): void {
  if (cache !== undefined || inflight) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

/** Re-fetch the admin session from the server and notify subscribers. */
export function refreshAdminSession(): Promise<void> {
  const p = load();
  inflight = p.finally(() => {
    inflight = null;
  });
  return p;
}

/** Optimistically set the admin session (right after a successful admin login)
 *  so the admin shell reveals immediately; reconciled against the server on the
 *  next page load. */
export function setAdminSession(session: AdminSession): void {
  cache = session;
  emit();
}

/** Clear the cached admin session (optimistic). Prefer `logoutAdmin()`, which
 *  also ends the server session. */
export function clearAdminSession(): void {
  cache = null;
  emit();
}

/** The current cached admin session (synchronous). `undefined` until first
 *  loaded — prefer `useAdminSession()` in components. */
export function getAdminSession(): AdminSession | null | undefined {
  return cache;
}

/**
 * Sign in as admin. POSTs to the auth backend; only an account with the `admin`
 * role is accepted here (a customer/vendor logging in on this page is rejected
 * so the public signup flow can never reach the admin console). On success the
 * server sets the session cookie and we mirror the email into the cache.
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
 * + first client render), then `null` (not an admin) or the session. Reads the
 * authoritative server session on mount.
 */
export function useAdminSession(): AdminSession | null | undefined {
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
