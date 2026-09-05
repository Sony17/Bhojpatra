import {
  findUserByEmail,
  saveUser,
  toPublicUser,
  newUserId,
  accountsFor,
  effectiveRole,
  type UserRecord,
  type UserRole,
} from "@/lib/users";
import { hashPassword, createSession } from "@/lib/auth";
import type { AccountType, PartnerMembership, PartnerRole } from "@/lib/session";

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

  // A partner signs up into exactly ONE lane (planner / individual / venue).
  // Take the first well-formed membership and ignore any extras.
  const sentRoles = Array.isArray(body.partnerRoles) ? body.partnerRoles : [];
  const firstMembership = sentRoles.find(
    (m): m is PartnerMembership =>
      !!m &&
      typeof m === "object" &&
      ["planner", "individual", "venue"].includes(
        (m as { type?: unknown }).type as PartnerRole,
      ) &&
      typeof (m as { referralCode?: unknown }).referralCode === "string",
  );
  const partnerRoles =
    accountType === "partner" && firstMembership ? [firstMembership] : undefined;
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;

  // ── One email ↔ one role ──────────────────────────────────────────────────
  // An email that already has an account keeps the role it signed up with —
  // account types are never combined on one login. Signing up again with the
  // same email is always rejected, whatever role was asked for.
  const existing = await findUserByEmail(email);
  if (existing) {
    const held = effectiveRole(existing);
    const label =
      held === "vendor"
        ? "a vendor"
        : held === "partner"
          ? "a partner"
          : held === "customer"
            ? "a customer"
            : "an admin";
    return Response.json(
      {
        error: `This email is already registered as ${label}. Each email can hold only one role — log in to that account, or sign up with a different email.`,
      },
      { status: 409 },
    );
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
  // Persist the single-role account set explicitly.
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
