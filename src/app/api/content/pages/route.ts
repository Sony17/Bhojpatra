/**
 * Company pages + contact details CMS — persisted as a single row in the
 * `settings` store.
 *
 * GET is public (the footer, the Company pages and the Contact page read it);
 * PUT/DELETE require an admin (Admin → Content Control → Pages / Contact). The
 * whole `SiteContent` object is stored verbatim and reconciled over the current
 * defaults on read.
 */
import {
  readSingleton,
  writeSingleton,
  deleteSingleton,
} from "@/lib/store";
import {
  DEFAULT_SITE_CONTENT,
  reconcile,
  type SiteContent,
} from "@/lib/sitePagesData";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KEY = "site-content";

// GET /api/content/pages → { content } — the reconciled live site content.
export async function GET() {
  const stored = await readSingleton<SiteContent>(KEY);
  return Response.json({ content: reconcile(stored) });
}

// PUT /api/content/pages { ...SiteContent } → persist the admin's edits.
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

  const content = reconcile(body as Partial<SiteContent>);
  try {
    await writeSingleton(KEY, content);
  } catch (err) {
    console.error("Failed to save site content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content });
}

// DELETE /api/content/pages → reset the Company pages + contact to defaults.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(KEY);
  } catch (err) {
    console.error("Failed to reset site content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content: DEFAULT_SITE_CONTENT });
}
