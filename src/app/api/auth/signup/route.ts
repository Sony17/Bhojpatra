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
import { createStore } from "@/lib/store";
import type { AccountType, PartnerMembership, PartnerRole } from "@/lib/session";
import {
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Public signup can only create these roles — never an admin.
const PUBLIC_ROLES: UserRole[] = ["customer", "vendor", "partner"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MinimalPartnerRecord {
  code: string;
  email?: string;
  ownerUserId?: string;
  deleted?: boolean;
}

const partnersStore = createStore<MinimalPartnerRecord>({
  table: "partners",
  idField: "code",
});

function isPartnerRole(v: unknown): v is PartnerRole {
  return v === "planner" || v === "individual" || v === "venue";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  // Rate limit: 5 signups / 10 min per IP
  const ipLimit = checkRateLimit(`signup:ip:${clientIp}`, 5, 600);
  if (!ipLimit.allowed) {
    return rateLimitResponse(
      ipLimit,
      "Too many accounts created from this IP. Please try again later.",
    );
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

  // Validate partner roles structure and types if supplied
  let partnerRoles: PartnerMembership[] | undefined;
  if (accountType === "partner" && body.partnerRoles !== undefined) {
    if (!Array.isArray(body.partnerRoles)) {
      return Response.json({ error: "Invalid partner roles." }, { status: 400 });
    }
    const validated: PartnerMembership[] = [];
    for (const item of body.partnerRoles) {
      if (!item || typeof item !== "object") {
        return Response.json({ error: "Invalid partner role." }, { status: 400 });
      }
      const raw = item as Record<string, unknown>;
      if (!isPartnerRole(raw.type)) {
        return Response.json({ error: "Invalid partner role type." }, { status: 400 });
      }
      const code = typeof raw.referralCode === "string" ? raw.referralCode.trim() : "";
      if (!code || !/^REF-[A-Z0-9-]+$/i.test(code)) {
        return Response.json({ error: "Invalid referral code." }, { status: 400 });
      }
      if (!validated.some((r) => r.type === raw.type)) {
        validated.push({ type: raw.type, referralCode: code });
      }
    }
    partnerRoles = validated;
  }

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

    // Verify that none of the requested referral codes belong to another partner
    if (partnerRoles?.length) {
      for (const m of partnerRoles) {
        const existingPartner =
          (await partnersStore.get(m.referralCode.toUpperCase())) ??
          (await partnersStore.get(m.referralCode));

        if (existingPartner && !existingPartner.deleted) {
          const isOwner =
            (existingPartner.ownerUserId && existingPartner.ownerUserId === existing.id) ||
            (existingPartner.email && existingPartner.email.toLowerCase() === existing.email.toLowerCase()) ||
            Boolean(existing.partnerRoles?.some((r) => r.referralCode.toUpperCase() === existingPartner.code.toUpperCase()));

          if (!isOwner) {
            return Response.json(
              { error: "This referral code belongs to another partner." },
              { status: 403 },
            );
          }
        }
      }
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
  // Verify that any requested referral codes do not belong to another partner
  if (partnerRoles?.length) {
    for (const m of partnerRoles) {
      const existingPartner =
        (await partnersStore.get(m.referralCode.toUpperCase())) ??
        (await partnersStore.get(m.referralCode));

      if (existingPartner && !existingPartner.deleted) {
        const isMatch =
          existingPartner.email &&
          existingPartner.email.toLowerCase() === email.toLowerCase();

        if (!isMatch) {
          return Response.json(
            { error: "This referral code belongs to another partner." },
            { status: 403 },
          );
        }
      }
    }
  }

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
