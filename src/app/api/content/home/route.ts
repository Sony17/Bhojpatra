/**
 * Home-page CMS content — persisted as a single row in the `settings` store.
 *
 * GET is public (every home-page section reads it); PUT/DELETE require an admin
 * (Admin → Content Control → Home Page). The whole `HomeContent` object is
 * stored verbatim and reconciled over the current defaults on read, so
 * newly-added fields always resolve to a value.
 */
import {
  readSingleton,
  writeSingleton,
  deleteSingleton,
} from "@/lib/store";
import {
  DEFAULT_HOME_CONTENT,
  reconcile,
  type HomeContent,
} from "@/lib/homeContentData";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KEY = "home-content";

// GET /api/content/home → { content } — the reconciled live home content.
export async function GET() {
  const stored = await readSingleton<HomeContent>(KEY);
  return Response.json({ content: reconcile(stored) });
}

// PUT /api/content/home { ...HomeContent } → persist the admin's edits.
export async function PUT(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid content." }, { status: 400 });
  }

  // Reconcile before persisting so the stored row is always a complete,
  // well-formed HomeContent regardless of which fields the client sent.
  const content = reconcile(body as Partial<HomeContent>);
  try {
    await writeSingleton(KEY, content);
  } catch (err) {
    console.error("Failed to save home content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content });
}

// DELETE /api/content/home → reset the home page back to the seed content.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(KEY);
  } catch (err) {
    console.error("Failed to reset home content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content: DEFAULT_HOME_CONTENT });
}
