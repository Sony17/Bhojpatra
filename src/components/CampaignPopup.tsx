"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { isUnoptimized } from "@/lib/homeContent";
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
      className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 [animation-duration:0.3s]"
      role="dialog"
      aria-modal="true"
      aria-label={t("Special offer", "विशेष ऑफ़र")}
      onClick={close}
    >
      {/* Card covers ~70% of the viewport (wider on small screens so it stays
          usable); the picture is contained within it so nothing is cropped. */}
      <div
        className="animate-rise relative h-[70vh] w-[90vw] max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] [animation-duration:0.4s] sm:w-[70vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={campaign.image}
          alt={campaign.name}
          fill
          sizes="(max-width: 640px) 90vw, 70vw"
          className="object-contain"
          unoptimized={isUnoptimized(campaign.image)}
          priority
        />

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
