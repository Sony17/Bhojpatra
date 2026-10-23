/**
 * Server-side read of the admin-editable CMS content (home page + Company
 * pages) for the root layout, so pages render the stored copy on first paint
 * instead of the seed defaults. Falls back to null if the DB is down — the
 * client hooks then refetch as before.
 *
 * DB cost: one query for both rows, and only on full page loads (client-side
 * navigation never re-renders the root layout). On Vercel it's zero — the
 * data cache there is shared by every instance and `revalidateTag` (fired by
 * the admin PUT/DELETE) purges it everywhere at once, so an edit is never
 * stale. Other hosts (e.g. App Runner) cache per instance, where one server
 * could keep serving a stale copy, so there it reads fresh every time.
 *
 * Legacy inline base64 images are swapped for media URLs before anything is
 * returned or cached, so the payload stays small.
 */
import { unstable_cache } from "next/cache";
import { readSingletons } from "@/lib/store";
import { externalizeImages } from "@/lib/contentMedia";
import { reconcile as reconcileHome, type HomeContent } from "@/lib/homeContentData";
import { reconcile as reconcileSite, type SiteContent } from "@/lib/sitePagesData";

/** Tag the admin content routes revalidate on save / reset. */
export const CONTENT_TAG = "cms-content";

interface InitialContent {
  home: HomeContent;
  site: SiteContent;
}

async function readContent(): Promise<InitialContent> {
  const rows = await readSingletons(["home-content", "site-content"]);
  return {
    home: externalizeImages(
      reconcileHome((rows["home-content"] ?? null) as Partial<HomeContent> | null),
      "home",
    ),
    site: externalizeImages(
      reconcileSite((rows["site-content"] ?? null) as Partial<SiteContent> | null),
      "site",
    ),
  };
}

const readContentShared = process.env.VERCEL
  ? unstable_cache(readContent, ["initial-content"], { tags: [CONTENT_TAG] })
  : readContent;

export async function loadInitialContent(): Promise<{
  home: HomeContent | null;
  site: SiteContent | null;
}> {
  try {
    return await readContentShared();
  } catch {
    return { home: null, site: null };
  }
}
