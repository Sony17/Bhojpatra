/**
 * Lightweight, zero-dependency in-memory rate limiter.
 *
 * SERVER-ONLY. Used to protect sensitive authentication, reset, and payment
 * endpoints against automated brute-force attacks and rapid request floods.
 *
 * NOTE ON SERVERLESS RUNTIME & ARCHITECTURAL BOUNDARIES:
 * In serverless environments (e.g., Vercel Lambda / Edge functions), in-memory
 * state is maintained per isolated runtime container and is not globally
 * synchronized across distinct parallel lambda instances.
 *
 * This implementation provides best-effort, zero-latency protection against
 * high-frequency automated burst attacks and credential stuffing on active
 * container instances without introducing external dependencies (Redis/Upstash)
 * or exhausting database connection limits. It should not be considered a
 * globally coordinated distributed rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

// Bounded in-memory store for rate-limit tracking
const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10_000;
let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 60_000; // 1 minute

/**
 * Remove expired entries to keep memory bounded and prevent leaks.
 */
function pruneExpiredEntries(now: number): void {
  if (now - lastPrune < PRUNE_INTERVAL_MS && store.size < MAX_ENTRIES) return;
  lastPrune = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
  // If still oversized after pruning expired, drop oldest entries
  if (store.size >= MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES + 1000;
    let dropped = 0;
    for (const key of store.keys()) {
      store.delete(key);
      dropped++;
      if (dropped >= excess) break;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until reset (0 if allowed)
}

/**
 * Check and record a rate-limit event for a given key.
 *
 * @param key Unique throttling identifier (e.g., `login:ip:email` or `signup:ip`)
 * @param limit Maximum allowed requests within the window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  pruneExpiredEntries(now);

  const windowMs = windowSeconds * 1000;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetTime: Math.ceil(resetAt / 1000),
      retryAfter: 0,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  const retryAfter = allowed
    ? 0
    : Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  const remaining = Math.max(0, limit - existing.count);

  return {
    allowed,
    limit,
    remaining,
    resetTime: Math.ceil(existing.resetAt / 1000),
    retryAfter,
  };
}

/** Reset in-memory rate limit store (used in tests). */
export function _resetRateLimitStore(): void {
  store.clear();
  lastPrune = Date.now();
}

/** Basic IP address format validator (IPv4 or IPv6). */
const IPV4_REGEX =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

function sanitizeIp(ip: string): string | null {
  const trimmed = ip.trim();
  if (IPV4_REGEX.test(trimmed) || (IPV6_REGEX.test(trimmed) && trimmed.includes(":"))) {
    return trimmed;
  }
  return null;
}

/**
 * Extract client IP from request headers.
 * Prefers trusted edge proxy headers (x-real-ip, cf-connecting-ip) and validates
 * against IP format to prevent spoofing via malformed headers.
 */
export function getClientIp(request: Request): string {
  // 1. Direct real-IP header populated by Vercel/reverse proxies
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    const sanitized = sanitizeIp(realIp);
    if (sanitized) return sanitized;
  }

  // 2. Cloudflare connecting IP
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    const sanitized = sanitizeIp(cfIp);
    if (sanitized) return sanitized;
  }

  // 3. Standard x-forwarded-for header (take first client hop)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstHop = forwarded.split(",")[0]?.trim();
    if (firstHop) {
      const sanitized = sanitizeIp(firstHop);
      if (sanitized) return sanitized;
    }
  }

  return "127.0.0.1";
}

/**
 * Construct a standardized HTTP 429 Too Many Requests response with standard
 * rate-limit headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  customMessage?: string,
): Response {
  const message =
    customMessage ||
    `Too many requests. Please try again in ${result.retryAfter} seconds.`;

  return Response.json(
    {
      error: message,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetTime),
      },
    },
  );
}
