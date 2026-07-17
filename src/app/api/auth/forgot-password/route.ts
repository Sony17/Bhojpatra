import { findUserByEmail, saveUser } from "@/lib/users";
import { hashPassword, makeResetToken, hashToken } from "@/lib/auth";
import { sendPasswordResetEmail, siteBaseUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

const IS_PROD = process.env.NODE_ENV === "production";
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Two modes:
 *   { email }                     → issue a reset token (stored hashed).
 *   { email, token, password }    → complete the reset with the token.
 * Always responds 200 for the issue step so account existence isn't leaked.
 * There's no email service wired, so in dev the issued token is returned in the
 * response for testing; in production it would be emailed instead.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return Response.json({ error: "Enter your email." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  // ── Complete the reset ──────────────────────────────────────────────────
  if (token && password) {
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    const user = await findUserByEmail(email);
    const valid =
      user &&
      user.resetTokenHash === hashToken(token) &&
      user.resetExpires &&
      new Date(user.resetExpires).getTime() > Date.now();
    if (!user || !valid) {
      return Response.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }
    user.passwordHash = await hashPassword(password);
    delete user.resetTokenHash;
    delete user.resetExpires;
    await saveUser(user);
    return Response.json({ ok: true, reset: true });
  }

  // ── Issue a reset token ─────────────────────────────────────────────────
  const user = await findUserByEmail(email);
  let devToken: string | undefined;
  if (user) {
    const { token: rawToken, hash } = makeResetToken();
    user.resetTokenHash = hash;
    user.resetExpires = new Date(Date.now() + RESET_TTL_MS).toISOString();
    await saveUser(user);

    // Email the reset link. Fall back to the request's own origin when neither
    // SITE_URL nor the Vercel URL is configured, so the link is always absolute.
    const base = siteBaseUrl() || new URL(request.url).origin;
    const resetUrl =
      `${base}/reset-password?token=${encodeURIComponent(rawToken)}` +
      `&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, resetUrl);

    if (!IS_PROD) devToken = rawToken;
  }

  return Response.json({
    ok: true,
    // Dev convenience only — omitted in production (would be emailed).
    ...(devToken ? { devToken } : {}),
  });
}
