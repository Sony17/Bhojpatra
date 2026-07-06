"use client";

import { useEffect, useState } from "react";

/**
 * Editable "Company" pages (About Us, Careers, Terms & Privacy, Refund Policy)
 * and the Contact-page business details (client hook).
 *
 * The content is persisted in the database via `/api/content/pages` (GET public,
 * PUT/DELETE admin). This module is the client-side access layer: the footer,
 * the public Company/Contact pages and the admin editors all read the live
 * content through `useSiteContent()` / `useSitePage()`, and the admin editors
 * write it via `saveSiteContent()`. A module-level cache is shared across every
 * component and refreshed from the API on first mount, so a page renders the
 * seed defaults on the server / first paint and swaps to the stored content
 * once it loads — and every subscriber re-renders the moment an admin saves.
 *
 * Types, seed defaults and `reconcile` live in the server-safe `sitePagesData`
 * module (shared with the API route) and are re-exported here so existing
 * imports from `@/lib/sitePages` keep working unchanged.
 */

import {
  DEFAULT_SITE_CONTENT,
  reconcile,
  type SiteContent,
  type SitePage,
} from "@/lib/sitePagesData";

export * from "@/lib/sitePagesData";

const ENDPOINT = "/api/content/pages";

/* ── Shared client cache (fetch once, notify all subscribers) ─────────────── */

let cache: SiteContent = DEFAULT_SITE_CONTENT;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Load the live content from the API once, caching + notifying on success. */
function ensureLoaded(): void {
  if (loaded || inflight) return;
  inflight = fetch(ENDPOINT, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { content?: Partial<SiteContent> } | null) => {
      if (json?.content) cache = reconcile(json.content);
      loaded = true;
      emit();
    })
    .catch(() => {
      /* offline — keep the default snapshot */
    })
    .finally(() => {
      inflight = null;
    });
}

/** Persist the next content (admin) and notify every subscriber. Optimistic:
 *  the cache updates immediately so the live site reflects the edit at once. */
export async function saveSiteContent(next: SiteContent): Promise<void> {
  cache = next;
  loaded = true;
  emit();
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!res.ok) {
    throw new Error("Failed to save site content.");
  }
  const json = (await res.json().catch(() => null)) as
    | { content?: Partial<SiteContent> }
    | null;
  if (json?.content) {
    cache = reconcile(json.content);
    emit();
  }
}

/** Reset the Company pages + contact details back to the seed content (admin). */
export async function resetSiteContent(): Promise<void> {
  cache = DEFAULT_SITE_CONTENT;
  loaded = true;
  emit();
  await fetch(ENDPOINT, { method: "DELETE" }).catch(() => {});
}

/** Read the live site content. Re-renders when the API loads or an admin saves. */
export function useSiteContent(): SiteContent {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return cache;
}

/** Convenience: a single page by slug (undefined if not found). */
export function useSitePage(slug: string): SitePage | undefined {
  return useSiteContent().pages.find((p) => p.slug === slug);
}
