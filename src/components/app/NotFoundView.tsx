"use client";

import { Button, EmptyState } from "@/components/ui";
import { useLang } from "@/lib/i18n";

/**
 * Branded 404 body — shown by `app/not-found.tsx` for an unknown URL and by any
 * segment that calls `notFound()`.
 *
 * A guest usually lands here from a stale link or a hand-edited search URL, so
 * the panel offers the two routes back into the funnel (start a booking, browse
 * brands) instead of a dead end.
 */
export default function NotFoundView() {
  const { t } = useLang();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <p className="mb-3 text-center font-display text-5xl leading-none text-maroon">
        404
      </p>
      <EmptyState
        title={t("We couldn't find that page", "वह पेज नहीं मिला")}
        message={t(
          "The link may be out of date, or the address was typed incorrectly. Your booking details are safe — pick up where you left off below.",
          "यह लिंक पुराना हो सकता है, या पता ग़लत टाइप हुआ है। आपकी बुकिंग सुरक्षित है — नीचे से आगे बढ़ें।",
        )}
        action={
          <>
            <Button href="/book">{t("Book a feast", "फ़ीस्ट बुक करें")}</Button>
            <Button href="/vendors" variant="secondary">
              {t("Browse brands", "ब्रांड देखें")}
            </Button>
            <Button href="/" variant="ghost">
              {t("Go home", "होम पर जाएँ")}
            </Button>
          </>
        }
      />
    </div>
  );
}
