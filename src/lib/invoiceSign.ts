import { createHmac, timingSafeEqual } from "crypto";

const IS_PROD = process.env.NODE_ENV === "production";

let cachedSecret: string | undefined;
export function getInvoiceSecret(): string {
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

/**
 * Computes an HMAC-SHA256 signature for a booking ID to enable secure public invoice viewing.
 */
export function signInvoiceId(bookingId: string): string {
  return createHmac("sha256", getInvoiceSecret())
    .update(`invoice:${bookingId}`)
    .digest("hex");
}

/**
 * Validates an HMAC signature for a booking ID in constant time.
 */
export function verifyInvoiceSignature(bookingId: string, sig: string): boolean {
  if (!bookingId || !sig || typeof sig !== "string") return false;
  try {
    const expected = signInvoiceId(bookingId);
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
