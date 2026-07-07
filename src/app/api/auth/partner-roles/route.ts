/**
 * Attach a partner role (Event Planner / Individual Referrer / Venue Owner) to
 * the current signed-in account. Replaces the former localStorage-only
 * `addPartnerRole` — the roles + their referral codes now live on the user
 * record so they survive a device change and drive the partner dashboards.
 */
import { getSessionUser } from "@/lib/auth";
import { getUserById, saveUser, toPublicUser, grantAccount } from "@/lib/users";
import type { PartnerRole } from "@/lib/session";

export const dynamic = "force-dynamic";

function isPartnerRole(v: unknown): v is PartnerRole {
  return v === "planner" || v === "individual" || v === "venue";
}

// POST /api/auth/partner-roles { type, referralCode } → attach the role.
export async function POST(request: Request) {
  const publicUser = await getSessionUser();
  if (!publicUser) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPartnerRole(body.type)) {
    return Response.json({ error: "Invalid partner role." }, { status: 400 });
  }
  const referralCode =
    typeof body.referralCode === "string" ? body.referralCode.trim() : "";
  if (!referralCode) {
    return Response.json({ error: "A referral code is required." }, { status: 400 });
  }

  const record = await getUserById(publicUser.id);
  if (!record) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const roles = record.partnerRoles ?? [];
  // Dedupe by role type — one code per role per account.
  if (!roles.some((r) => r.type === body.type)) {
    record.partnerRoles = [...roles, { type: body.type, referralCode }];
  }
  // Holding a referral role adds the partner account. This keeps the person's
  // primary role (so a customer stays customer-first) and leaves admins alone —
  // grantAccount no-ops on admins.
  grantAccount(record, "partner");

  try {
    await saveUser(record);
  } catch (err) {
    console.error("Failed to attach partner role", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(record) });
}
