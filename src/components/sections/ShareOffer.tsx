"use client";

import { useSyncExternalStore } from "react";
import { Button, useToast, cn } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { Share, Copy } from "@/components/icons";
import WhatsAppShareButton, { SITE_ORIGIN } from "@/components/WhatsAppShareButton";

/** Where a shared offer link points — the home page's promotional offers band. */
const OFFER_PATH = "/#offers";
/** Canonical, always-live link shared by every channel (never localhost/preview). */
const OFFER_URL = `${SITE_ORIGIN}${OFFER_PATH}`;

const subscribe = () => () => {};
const hasNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * "Share this offer" — a compact row of share actions for the promotional
 * offers band. Where the browser supports it, the first button opens the native
 * OS share sheet; everywhere we also expose WhatsApp and copy-link.
 *
 * With `compact`, the prompt label is dropped and buttons sit in a single
 * inline row so the promo banner keeps most of the visual space.
 */
export default function ShareOffer({
  heading,
  subtitle,
  compact = false,
  className,
}: {
  heading: string;
  subtitle: string;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useLang();
  const { toast } = useToast();

  const canNativeShare = useSyncExternalStore(subscribe, hasNativeShare, () => false);

  const promoLine = `${heading} — ${subtitle}`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title: heading, text: promoLine, url: OFFER_URL });
    } catch {
      // Visitor dismissed the sheet (AbortError) or it's unavailable — no-op.
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(OFFER_URL);
      toast(t("Offer link copied!", "ऑफर लिंक कॉपी हो गया!"), { tone: "success" });
    } catch {
      toast(t("Couldn't copy the link.", "लिंक कॉपी नहीं हो सका।"), {
        tone: "error",
      });
    }
  }

  return (
    <div
      className={cn(
        compact
          ? "flex items-center justify-center gap-1.5"
          : "flex flex-col items-center gap-2.5 text-center",
        className,
      )}
    >
      {!compact && (
        <span className="text-xs font-medium text-cream/75">
          {t("Loved this offer? Share it", "यह ऑफर पसंद आया? इसे साझा करें")}
        </span>
      )}
      <div className={cn("flex flex-wrap items-center", compact ? "gap-1.5" : "justify-center gap-2.5")}>
        {canNativeShare && (
          <Button
            type="button"
            variant="inverse"
            size="sm"
            leftIcon={<Share className="h-3.5 w-3.5" />}
            onClick={handleNativeShare}
            aria-label={t("Share", "साझा करें")}
            className={compact ? "px-2" : undefined}
          >
            {compact ? null : t("Share", "साझा करें")}
          </Button>
        )}
        <WhatsAppShareButton
          path={OFFER_PATH}
          message={promoLine}
          messageHi={promoLine}
          label="WhatsApp"
          labelHi="WhatsApp"
          variant="inverse"
          size="sm"
          className={compact ? "px-3" : undefined}
        />
        <Button
          type="button"
          variant="inverse"
          size="sm"
          leftIcon={<Copy className="h-3.5 w-3.5" />}
          onClick={handleCopy}
          aria-label={t("Copy link", "लिंक कॉपी करें")}
          className={compact ? "px-2" : undefined}
        >
          {compact ? null : t("Copy link", "लिंक कॉपी करें")}
        </Button>
      </div>
    </div>
  );
}
