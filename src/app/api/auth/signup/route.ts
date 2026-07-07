import {
  findUserByEmail,
  saveUser,
  toPublicUser,
  newUserId,
  accountsFor,
  grantAccount,
  type UserRecord,
  type UserRole,
} from "@/lib/users";
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
} from "@/lib/auth";
import type { AccountType, PartnerMembership } from "@/lib/session";

export const dynamic = "force-dynamic";

// Public signup can only create these roles — never an admin.
const PUBLIC_ROLES: UserRole[] = ["customer", "vendor", "partner"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const role = body.role;
  if (!PUBLIC_ROLES.includes(role as UserRole)) {
    return Response.json({ error: "Invalid account type." }, { status: 400 });
  }
  const accountType = role as AccountType;

  const partnerRoles =
    accountType === "partner" && Array.isArray(body.partnerRoles)
      ? (body.partnerRoles as PartnerMembership[])
      : undefined;
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;

  // ── Existing email → attach this account type to the same person ──────────
  // One human can be a customer, a vendor AND a referral partner. Rather than
  // rejecting a repeat signup, we add the new account to their record — but only
  // after proving they own it (a matching session cookie, or the right
  // password). Otherwise this would be an account-takeover vector.
  const existing = await findUserByEmail(email);
  if (existing) {
    const sessionUser = await getSessionUser();
    const authorized =
      sessionUser?.email === email ||
      (await verifyPassword(password, existing.passwordHash));
    if (!authorized) {
      return Response.json(
        {
          error:
            "An account with this email already exists. Log in with your password to add this account type.",
        },
        { status: 409 },
      );
    }

    grantAccount(existing, accountType);
    if (name && !existing.name) existing.name = name;
    if (partnerRoles?.length) {
      const held = existing.partnerRoles ?? [];
      for (const m of partnerRoles) {
        if (!held.some((r) => r.type === m.type)) held.push(m);
      }
      existing.partnerRoles = held;
    }

    try {
      await saveUser(existing);
      await createSession(existing);
    } catch (err) {
      console.error("Account attach failed", err);
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
    return Response.json({ user: toPublicUser(existing) });
  }

  // ── New person → fresh record ─────────────────────────────────────────────
  const user: UserRecord = {
    id: newUserId(),
    email,
    name,
    role: accountType,
    passwordHash: await hashPassword(password),
    ...(partnerRoles ? { partnerRoles } : {}),
    createdAt: new Date().toISOString(),
  };
  // Persist the explicit account set (customer is universal + whatever they
  // signed up as) so later attaches have a complete list to union against.
  user.accounts = accountsFor(user);

  try {
    await saveUser(user);
    await createSession(user);
  } catch (err) {
    console.error("Signup failed", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(user) }, { status: 201 });
}
