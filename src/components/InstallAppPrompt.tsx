"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Branded "Install app" prompt — the Bhojpatra version of the bar Chrome shows
 * for installable PWAs.
 *
 * Chrome/Edge/Samsung fire `beforeinstallprompt` when the site qualifies. We
 * cancel their default mini-infobar, keep the event, and show this red/cream
 * card instead; tapping Install replays the stashed event so the real OS
 * install dialog opens (that dialog draws its icon and name from
 * `src/app/manifest.ts`). iOS Safari has no such event, so there we show the
 * Share → "Add to Home Screen" instructions instead.
 *
 * Shows once the visitor has settled in (a short delay, after CampaignPopup),
 * never in an already-installed window, and stays snoozed for two weeks after
 * a dismissal so it never nags.
 */

/** Minimal shape of the Chrome-only `beforeinstallprompt` event. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SNOOZE_KEY = "bhojpatra:install-prompt-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // two weeks
const REVEAL_DELAY_MS = 4500;

function snoozed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false; // private mode / storage blocked — just show it
  }
}

function snooze(): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

/** Already running as an installed app — nothing to install. */
function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for home-screen launches
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS Safari: installable, but only by hand via the Share sheet. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Chrome/Firefox on iOS can't add to home screen at all — don't tease them.
  const safari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari;
}

export default function InstallAppPrompt() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    snooze();
  }, []);

  // Catch Chrome's install signal (it can fire before this mounts, so the
  // inline script in the root layout stashes an early one on `window`).
  useEffect(() => {
    if (isInstalled() || snoozed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress Chrome's own mini-infobar
      setDeferred(e as InstallPromptEvent);
    };
    // Read what the browser already told us — the event the inline head script
    // caught before React hydrated, and the platform. Both land on the next
    // tick rather than synchronously in the effect body.
    const early = (window as Window & { __bpInstallPrompt?: InstallPromptEvent })
      .__bpInstallPrompt;
    const bootstrap = window.setTimeout(() => {
      if (early) setDeferred(early);
      // iOS never fires the event — offer the manual route instead.
      if (isIosSafari()) setIosHint(true);
    }, 0);

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      snooze();
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.clearTimeout(bootstrap);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Reveal a beat after the page settles — and never on top of an open modal
  // (the home-page campaign popup, a booking sheet). If one is up we keep
  // checking back and slide in once the visitor has closed it.
  useEffect(() => {
    if (!deferred && !iosHint) return;
    let timer = 0;
    const tick = () => {
      if (document.querySelector('[aria-modal="true"]')) {
        timer = window.setTimeout(tick, 1500);
        return;
      }
      setOpen(true);
    };
    timer = window.setTimeout(tick, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [deferred, iosHint]);

  // Escape closes, like every other overlay in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "dismissed") snooze();
      // The event is single-use — Chrome re-fires it on a later visit.
      setDeferred(null);
      setOpen(false);
    } catch {
      setOpen(false);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={t("Install the Bhojpatra app", "भोजपत्र ऐप इंस्टॉल करें")}
      className="animate-rise fixed inset-x-0 bottom-[calc(var(--tab-bar-h)_+_var(--safe-bottom)_+_0.75rem)] z-[70] px-3 [animation-duration:0.4s] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[25rem] lg:px-0"
    >
      {/* Cream surface so the red app tile reads as the tile — the same
          artwork the OS is about to drop on the home screen. */}
      <div className="relative overflow-hidden rounded-sheet bg-cream p-4 shadow-modal ring-1 ring-maroon">
        <div className="flex items-start gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={112}
            height={112}
            className="h-14 w-14 shrink-0 rounded-[1rem] shadow-card"
          />

          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] leading-none text-maroon">
              bhojpatra
            </p>
            <p className="mt-1.5 text-sm leading-snug text-ink">
              {iosHint
                ? t(
                    "Add Bhojpatra to your Home Screen for one-tap booking.",
                    "एक टैप में बुकिंग के लिए भोजपत्र को होम स्क्रीन पर जोड़ें।",
                  )
                : t(
                    "Install the app — book faster, track orders, works offline.",
                    "ऐप इंस्टॉल करें — तेज़ बुकिंग, ऑर्डर ट्रैकिंग, ऑफ़लाइन भी चले।",
                  )}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={t("Not now", "अभी नहीं")}
            className="focus-ring -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-maroon transition-colors hover:bg-maroon hover:text-cream"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {iosHint ? (
          /* iOS has no programmatic install — walk them through the Share sheet. */
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-control bg-maroon px-3 py-2.5 text-xs text-cream">
            <span className="flex items-center gap-1.5">
              {t("Tap", "टैप करें")}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
                <path d="M6 12H5v8h14v-8h-1" />
              </svg>
            </span>
            <span aria-hidden>→</span>
            <span className="font-semibold">
              {t("Add to Home Screen", "होम स्क्रीन में जोड़ें")}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={close}
              className="focus-ring tap flex-1 rounded-control border border-maroon px-4 py-2.5 text-sm font-semibold text-maroon transition-colors hover:bg-maroon hover:text-cream"
            >
              {t("Not now", "अभी नहीं")}
            </button>
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="btn-sheen focus-ring tap group relative flex-1 rounded-control bg-maroon px-4 py-2.5 text-sm font-semibold text-cream shadow-brand transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-pop active:scale-[.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {installing
                ? t("Opening…", "खुल रहा है…")
                : t("Install app", "ऐप इंस्टॉल करें")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
