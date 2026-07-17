"use client";

import { useLang } from "@/lib/i18n";
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui";
import { WhatsApp } from "@/components/icons";

/**
 * "Share on WhatsApp" button — the app-wide way to *promote* Bhojpatra.
 *
 * Opens WhatsApp with a prefilled promo message + link and **no fixed
 * recipient** (`wa.me/?text=…`), so the user forwards it to any contact and
 * spreads the brand. This is deliberately different from the FloatingChat /
 * Packages "Chat on WhatsApp" links, which message the Bhojpatra *business
 * number* directly (`wa.me/<number>?text=…`).
 *
 * Renders the shared `Button`, so radius, height, focus ring and motion match
 * every other button; pick a `variant` that sits below the page's primary CTA
 * (usually `ghost` / `secondary`).
 */

/**
 * Canonical public origin used to build shareable deep-links. Always points at
 * the live site — never localhost or a preview deployment — so a forwarded link
 * lands on the real page. Mirrors `contact.website` in sitePagesData.
 */
export const SITE_ORIGIN = "https://www.bhojpatra.co.in";

/** Absolute shareable URL for a site path (or the home page when omitted). */
function shareUrl(path?: string): string {
  if (!path) return SITE_ORIGIN;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface WhatsAppShareButtonProps {
  /** Site path to share, e.g. "/vendors/khazana-delhi". Omit to share the home page. */
  path?: string;
  /** Promo line (English) prepended to the shared link. */
  message: string;
  /** Promo line (Hindi). */
  messageHi: string;
  /** Button label — defaults to "Share on WhatsApp". */
  label?: string;
  labelHi?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

export default function WhatsAppShareButton({
  path,
  message,
  messageHi,
  label,
  labelHi,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
}: WhatsAppShareButtonProps) {
  const { t } = useLang();
  const text = `${t(message, messageHi)} ${shareUrl(path)}`;
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  // Empty string labels → icon-only (compact promo strip).
  const showLabel = label !== "" && labelHi !== "";
  const buttonLabel = showLabel
    ? t(label ?? "Share on WhatsApp", labelHi ?? "व्हाट्सएप पर शेयर करें")
    : null;

  return (
    <Button
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      leftIcon={<WhatsApp className="h-3.5 w-3.5" />}
      aria-label={
        buttonLabel ?? t("Share on WhatsApp", "व्हाट्सएप पर शेयर करें")
      }
    >
      {buttonLabel}
    </Button>
  );
}
