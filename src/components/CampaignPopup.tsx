"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { AdminCampaign } from "@/lib/admin/types";

/**
 * Home-page promotional popup. Fetches the currently-running campaign from
 * `GET /api/campaigns/active` (the most recent Active one an admin set in
 * Admin → Campaigns) and shows its picture in a modal covering ~70% of the
 * screen. It appears on every home-page visit; closing it (X / Escape / click
 * outside) only hides it for the current view — reloading or coming back shows
 * it again.
 */

/** Absolute URLs (offers on another site) open in a new tab; in-site paths
 *  (`/packages`) navigate in place. */
function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
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
        if (c?.image) setCampaign(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Reveal a moment after the campaign loads so it doesn't fight the first paint.
  useEffect(() => {
    if (!campaign) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
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
        className="animate-rise relative inline-block max-h-[85vh] max-w-[80vw] overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] [animation-duration:0.4s] sm:max-h-[74vh] sm:max-w-[74vw]"
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
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/40 transition-colors hover:bg-black/60"
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
