"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";

const DISMISS_KEY = "feast2027NoticeDismissed";

/**
 * Dismissible notice shown at the top of /book while Feast bookings are not
 * yet open (see `FEAST_BOOKING_OPEN` in `src/lib/launchFlags.ts`). Points
 * guests to the home-page feast packages, where Book opens the interest popup.
 */
export default function FeastNoticeBanner() {
  const { t } = useLang();
  // Start hidden so a session-dismissed banner never flashes on hydration.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(DISMISS_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Session-only nicety; losing it just means the banner shows again.
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] px-3 pt-4 sm:px-6 lg:px-8">
      <div
        role="status"
        className="flex flex-col gap-2 rounded-card border border-maroon/25 bg-cream/60 px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:gap-4"
      >
        <p className="min-w-0 flex-1 text-sm leading-snug text-ink">
          <span className="font-semibold text-maroon">
            {t(
              "Feast bookings open in 2027.",
              "फीस्ट बुकिंग 2027 में शुरू होंगी।",
            )}
          </span>{" "}
          {t(
            "Pick a feast package on the home page to register your interest.",
            "रुचि दर्ज करने के लिए होम पेज पर कोई फीस्ट पैकेज चुनें।",
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button href="/#packages" variant="primary" size="sm">
            {t("See feast packages", "फीस्ट पैकेज देखें")}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("Dismiss notice", "सूचना बंद करें")}
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink/60 transition-colors hover:bg-cream hover:text-ink"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
