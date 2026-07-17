"use client";

import { useEffect, useState } from "react";

/**
 * Editable content + imagery for the public **home page** (client hook).
 *
 * The content is persisted in the database via `/api/content/home` (GET public,
 * PUT/DELETE admin). This module is the client-side access layer: every
 * home-page section reads the live content through `useHomeContent()`, and
 * Admin → Content Control → Home Page writes it via `saveHomeContent()`. A
 * module-level cache is shared across every component instance and refreshed
 * from the API on first mount, so a section renders the seed defaults on the
 * server / first paint and swaps to the stored content once it loads — and every
 * subscriber re-renders the moment an admin saves.
 *
 * Types, seed defaults, `reconcile` and `isUnoptimized` live in the server-safe
 * `homeContentData` module (shared with the API route) and are re-exported here
 * so existing imports from `@/lib/homeContent` keep working unchanged.
 */

import {
  DEFAULT_HOME_CONTENT,
  reconcile,
  type HomeContent,
} from "@/lib/homeContentData";

export * from "@/lib/homeContentData";

const ENDPOINT = "/api/content/home";

/* ── Shared client cache (fetch once, notify all subscribers) ─────────────── */

let cache: HomeContent = DEFAULT_HOME_CONTENT;
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
    .then((json: { content?: Partial<HomeContent> } | null) => {
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
 *  the cache updates immediately so the live page reflects the edit at once. */
export async function saveHomeContent(next: HomeContent): Promise<void> {
  cache = next;
  loaded = true;
  emit();
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!res.ok) {
    throw new Error("Failed to save home content.");
  }
  const json = (await res.json().catch(() => null)) as
    | { content?: Partial<HomeContent> }
    | null;
  if (json?.content) {
    cache = reconcile(json.content);
    emit();
  }
}

/** Reset the home page back to the seed content (admin). */
export async function resetHomeContent(): Promise<void> {
  cache = DEFAULT_HOME_CONTENT;
  loaded = true;
  emit();
  await fetch(ENDPOINT, { method: "DELETE" }).catch(() => {});
}

/** Read the live home content. Re-renders when the API loads or an admin saves. */
export function useHomeContent(): HomeContent {
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

/** Whether the live content has resolved from the API yet (vs. the seed default
 *  snapshot shown on first paint). Guards writes that would otherwise persist
 *  the defaults over stored content before the fetch lands. */
export function useHomeContentLoaded(): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    ensureLoaded();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return loaded;
}
