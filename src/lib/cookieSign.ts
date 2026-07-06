/**
 * Session-cookie signing — a tiny, self-contained module (Node `crypto` only,
 * no `next/headers`, no DB client) so it can be imported from BOTH the auth
 * route handlers (`auth.ts`) and the edge/proxy gate (`proxy.ts`) without
 * pulling heavy server dependencies into the proxy bundle.
 *
 * The cookie value is `<token>.<hmac>`; the HMAC is checked in constant time.
 * This proves the token wasn't forged — the authoritative "is this session
 * live?" check (DB lookup + expiry) still happens in `getSessionUser`.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "bp_session";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Resolve the HMAC secret lazily (memoized), NOT at module import. The "required
 * in production" guard must fire at request time, never at load time — otherwise
 * `next build`'s page-data collection (which imports every route module) would
 * demand the secret just to read a route's exports, failing the build in any
 * environment where the secret isn't present at build.
 */
let cachedSecret: string | undefined;
export function getSessionSecret(): string {
  if (cachedSecret !== undefined) return cachedSecret;
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return (cachedSecret = s);
  if (IS_PROD) {
    throw new Error(
      "SESSION_SECRET is required in production (set a 32+ char random value).",
    );
  }
  return (cachedSecret = "dev-insecure-session-secret-change-me");
}

export function signToken(token: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(token)
    .digest("base64url");
}

/** Verify a `token.sig` cookie value; returns the token when the signature is
 *  valid, else null. Signature-only — safe to call without any DB access. */
export function verifyCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const token = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(signToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}
