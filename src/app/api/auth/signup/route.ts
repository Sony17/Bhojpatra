import {
  findUserByEmail,
  saveUser,
  toPublicUser,
  newUserId,
  type UserRecord,
  type UserRole,
} from "@/lib/users";
import { hashPassword, createSession } from "@/lib/auth";
import type { PartnerMembership } from "@/lib/session";

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

  if (await findUserByEmail(email)) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const partnerRoles =
    role === "partner" && Array.isArray(body.partnerRoles)
      ? (body.partnerRoles as PartnerMembership[])
      : undefined;

  const user: UserRecord = {
    id: newUserId(),
    email,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
    role: role as UserRole,
    passwordHash: await hashPassword(password),
    ...(partnerRoles ? { partnerRoles } : {}),
    createdAt: new Date().toISOString(),
  };

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
