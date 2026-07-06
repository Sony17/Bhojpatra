/**
 * The signed-in user's UI preferences. Currently just the language choice,
 * persisted on the user record so it follows them across devices (replaces the
 * former localStorage-only language toggle).
 */
import { getSessionUser } from "@/lib/auth";
import { getUserById, saveUser, toPublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

// PATCH /api/auth/preferences { lang } → save the language preference.
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

  if (body.lang !== "en" && body.lang !== "hi") {
    return Response.json({ error: "Invalid language." }, { status: 400 });
  }

  const record = await getUserById(publicUser.id);
  if (!record) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  record.lang = body.lang;

  try {
    await saveUser(record);
  } catch (err) {
    console.error("Failed to save language preference", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(record) });
}
