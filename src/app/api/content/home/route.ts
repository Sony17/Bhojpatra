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
import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/initialContent";
import {
  externalizeImages,
  extractInlineImages,
  internalizeImages,
} from "@/lib/contentMedia";

export const dynamic = "force-dynamic";

const KEY = "home-content";

// GET /api/content/home → { content } — the reconciled live home content.
export async function GET() {
  const stored = await readSingleton<HomeContent>(KEY);
  // Inline images go out as cacheable URLs, not megabytes of base64.
  return Response.json({
    content: externalizeImages(reconcile(stored), "home"),
  });
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
  // The editor holds media URLs (see GET); map them back to the stored
  // inline images so saving never drops one.
  const previous = await readSingleton<HomeContent>(KEY);
  let content = reconcile(
    internalizeImages(body as Partial<HomeContent>, previous, "home"),
  );
  try {
    // Images live in their own rows; the content keeps only their URLs.
    content = await extractInlineImages(content);
    await writeSingleton(KEY, content);
    // Purge the layout's cached copy (shared across instances on Vercel).
    revalidateTag(CONTENT_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to save home content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({
    ok: true,
    content: externalizeImages(content, "home"),
  });
}

// DELETE /api/content/home → reset the home page back to the seed content.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(KEY);
    // Purge the layout's cached copy (shared across instances on Vercel).
    revalidateTag(CONTENT_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to reset home content", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, content: DEFAULT_HOME_CONTENT });
}
