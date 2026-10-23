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
import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/initialContent";
import {
  externalizeImages,
  extractInlineImages,
  internalizeImages,
} from "@/lib/contentMedia";

export const dynamic = "force-dynamic";

const KEY = "site-content";

// GET /api/content/pages → { content } — the reconciled live site content.
export async function GET() {
  const stored = await readSingleton<SiteContent>(KEY);
  // Inline images go out as cacheable URLs, not megabytes of base64.
  return Response.json({
    content: externalizeImages(reconcile(stored), "site"),
  });
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

  // The editor holds media URLs (see GET); map them back to the stored
  // inline images so saving never drops one.
  const previous = await readSingleton<SiteContent>(KEY);
  let content = reconcile(
    internalizeImages(body as Partial<SiteContent>, previous, "site"),
  );
  try {
    // Images live in their own rows; the content keeps only their URLs.
    content = await extractInlineImages(content);
    await writeSingleton(KEY, content);
    // Purge the layout's cached copy (shared across instances on Vercel).
    revalidateTag(CONTENT_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to save site content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({
    ok: true,
    content: externalizeImages(content, "site"),
  });
}

// DELETE /api/content/pages → reset the Company pages + contact to defaults.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(KEY);
    // Purge the layout's cached copy (shared across instances on Vercel).
    revalidateTag(CONTENT_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to reset site content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content: DEFAULT_SITE_CONTENT });
}
