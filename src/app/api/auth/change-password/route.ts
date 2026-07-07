import { getSessionUser, verifyPassword, hashPassword } from "@/lib/auth";
import { getUserById, saveUser } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Change the signed-in user's password. Requires the current password (so a
 * hijacked session can't silently rotate credentials) and rehashes the new one
 * with scrypt. Scoped to the caller's own account — the session identifies who,
 * never the request body. Used by the admin console's "Change Password" tab.
 */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return Response.json(
      { error: "Enter your current and new password." },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  // Load the full record — the session projection omits the password hash.
  const user = await getUserById(sessionUser.id);
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return Response.json(
      { error: "Your current password is incorrect." },
      { status: 400 },
    );
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    return Response.json(
      { error: "New password must be different from your current one." },
      { status: 400 },
    );
  }

  user.passwordHash = await hashPassword(newPassword);
  await saveUser(user);

  return Response.json({ ok: true });
}
