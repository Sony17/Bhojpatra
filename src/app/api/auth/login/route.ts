import { findUserByEmail, toPublicUser } from "@/lib/users";
import { verifyPassword, createSession, seedAdminIfMissing } from "@/lib/auth";
import {
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);

  // Rate limit: 15 attempts / 60s per IP; 5 attempts / 60s per (IP + email)
  const ipLimit = checkRateLimit(`login:ip:${clientIp}`, 15, 60);
  if (!ipLimit.allowed) {
    return rateLimitResponse(
      ipLimit,
      "Too many login attempts from this IP. Please try again later.",
    );
  }
  const targetLimit = checkRateLimit(
    `login:target:${clientIp}:${email}`,
    5,
    60,
  );
  if (!targetLimit.allowed) {
    return rateLimitResponse(
      targetLimit,
      "Too many login attempts for this account. Please try again later.",
    );
  }

  // Make sure the bootstrap admin exists before the first admin login.
  await seedAdminIfMissing();

  const user = await findUserByEmail(email);
  // Same message whether the email is unknown or the password is wrong — don't
  // leak which accounts exist.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  try {
    await createSession(user);
  } catch (err) {
    console.error("Login failed", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(user) });
}
