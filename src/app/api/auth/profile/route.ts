/**
 * The signed-in user's profile. Currently just the display name — the email is
 * the unique login handle and stays immutable here. Persists to the user record
 * and returns the refreshed public projection so the client session can update
 * the header/menu immediately (mirrors `/api/auth/preferences`).
 */
import { getSessionUser } from "@/lib/auth";
import { getUserById, saveUser, toPublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

/** Keep names within a sane, single-line length. */
const MAX_NAME_LEN = 80;

// PATCH /api/auth/profile { name } → save the display name.
export async function PATCH(request: Request) {
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

  if (typeof body.name !== "string") {
    return Response.json({ error: "Invalid name." }, { status: 400 });
  }
  const name = body.name.trim().slice(0, MAX_NAME_LEN);

  const record = await getUserById(publicUser.id);
  if (!record) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  // An empty name clears it — the UI then falls back to the account-type label.
  record.name = name || undefined;

  try {
    await saveUser(record);
  } catch (err) {
    console.error("Failed to save profile", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(record) });
}
