"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { AdminCampaign } from "@/lib/admin/types";

/**
 * Home-page promotional popup. Fetches the currently-running campaign from
 * `GET /api/campaigns/active` (the most recent Active one an admin set in
 * Admin → Campaigns) and shows its picture in a modal covering ~70% of the
 * screen. It shows **once per visitor** — the first time someone opens the
 * site — and is then remembered in `localStorage` so reloads and return visits
 * don't show it again. Publishing a *new* campaign (new id) shows once more.
 */

/** Absolute URLs (offers on another site) open in a new tab; in-site paths
 *  (`/packages`) navigate in place. */
function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Per-campaign "already seen" flag. Keyed by id so a freshly-published
 *  campaign shows once even to visitors who saw the previous one. Guarded so a
 *  blocked/absent `localStorage` (private mode) simply falls back to showing. */
const seenKey = (id: string) => `bhojpatra:campaign-seen:${id}`;

function hasSeen(id: string): boolean {
  try {
    return window.localStorage.getItem(seenKey(id)) !== null;
  } catch {
    return false;
  }
}

function markSeen(id: string): void {
  try {
    window.localStorage.setItem(seenKey(id), "1");
  } catch {
    /* ignore — private mode / storage disabled */
  }
}

export default function CampaignPopup() {
  const { t } = useLang();
  const [campaign, setCampaign] = useState<AdminCampaign | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/campaigns/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        const c = json?.campaign as AdminCampaign | null | undefined;
        // Only load a campaign this visitor hasn't already seen — otherwise it
        // stays hidden on reloads and return visits.
        if (c?.image && !hasSeen(c.id)) setCampaign(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Reveal a moment after the campaign loads so it doesn't fight the first
  // paint, and remember it so it won't show again on the next visit.
  useEffect(() => {
    if (!campaign) return;
    const timer = window.setTimeout(() => {
      markSeen(campaign.id);
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [campaign]);

  // Close on Escape while the popup is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!campaign || !open) return null;

  return (
    <div
      className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 [animation-duration:0.3s]"
      role="dialog"
      aria-modal="true"
      aria-label={t("Special offer", "विशेष ऑफ़र")}
      onClick={close}
    >
      {/* Card hugs the picture — it sizes to the image's own aspect ratio, so
          there are no white letterbox bars on any screen. On mobile the image
          always spans 80% of the screen width (any size scales to fit); on
          desktop it's capped to ~74% of the viewport. */}
      <div
        className="animate-rise relative inline-block max-h-[85vh] max-w-[80vw] overflow-hidden rounded-card shadow-modal [animation-duration:0.4s] sm:max-h-[74vh] sm:max-w-[74vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Two sizes: the browser picks the mobile image on phones and the web
            image otherwise. When no mobile image is set the web image is the
            fallback everywhere. The <img> sizes the card to whichever renders. */}
        <picture>
          {campaign.mobileImage && (
            <source srcSet={campaign.mobileImage} media="(max-width: 640px)" />
          )}
          <img
            src={campaign.image}
            alt={campaign.name}
            className="block h-auto w-[80vw] max-h-[85vh] object-contain sm:h-auto sm:w-auto sm:max-h-[74vh] sm:max-w-[74vw]"
          />
        </picture>

        {/* Whole picture is the click target when a link is set. */}
        {campaign.linkUrl && (
          <a
            href={campaign.linkUrl}
            onClick={close}
            aria-label={campaign.name}
            className="absolute inset-0"
            {...(isExternal(campaign.linkUrl)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          />
        )}

        <button
          type="button"
          onClick={close}
          aria-label={t("Close", "बंद करें")}
          className="focus-ring absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/40 transition-colors hover:bg-black/60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
