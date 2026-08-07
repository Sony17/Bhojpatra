"use client";

import { useEffect } from "react";
import PublicShell from "@/components/app/PublicShell";
import { Button, EmptyState } from "@/components/ui";
import { useLang } from "@/lib/i18n";

/**
 * App-wide error boundary. Without this file an uncaught client exception on any
 * route (e.g. /book carrying the Hero's search params) falls through to Next's
 * built-in black "This page couldn't load" screen, which drops the guest out of
 * the brand entirely and offers only a raw reload.
 *
 * This sits inside the root layout, so the Header, Footer and the language
 * context are all still mounted — the guest keeps the site chrome and can
 * retry the failed segment or step back into the funnel.
 *
 * Next 16.2 renamed the recovery prop to `unstable_retry` (it re-fetches and
 * re-renders the segment); `reset` is kept as the older clear-state fallback.
 */
export default function AppError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    // Surface the real cause — the digest is the only handle on a minified
    // production stack, so log it alongside the error.
    console.error("[bhojpatra] route error", error.digest ?? "", error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <EmptyState
          title={t("Something went wrong", "कुछ ग़लत हो गया")}
          message={t(
            "We couldn't load this page just now. Trying again usually fixes it — nothing you'd entered has been booked or charged.",
            "यह पेज अभी लोड नहीं हो सका। दोबारा कोशिश करने से आमतौर पर ठीक हो जाता है — आपकी कोई बुकिंग या भुगतान नहीं हुआ है।",
          )}
          action={
            <>
              {retry && (
                <Button onClick={() => retry()}>
                  {t("Try again", "फिर कोशिश करें")}
                </Button>
              )}
              <Button href="/book" variant="secondary">
                {t("Back to booking", "बुकिंग पर लौटें")}
              </Button>
              <Button href="/" variant="ghost">
                {t("Go home", "होम पर जाएँ")}
              </Button>
            </>
          }
        />
        {error.digest && (
          <p className="mt-4 text-center text-xs text-ink/45">
            {t("Reference", "संदर्भ")}: {error.digest}
          </p>
        )}
      </div>
    </PublicShell>
  );
}
