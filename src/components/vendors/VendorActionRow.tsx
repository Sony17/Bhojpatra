"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

/**
 * 4-button action row for vendor pages: Book Now, WhatsApp, Share, Compare.
 * Laid out horizontally in a single responsive row (4 columns).
 */
export default function VendorActionRow({
  bookHref,
  vendorName,
  vendorCity,
  priceFrom,
  inCompare = false,
  compareDisabled = false,
  onToggleCompare,
  className = "",
}: {
  bookHref: string;
  vendorName: string;
  vendorCity?: string;
  priceFrom?: number;
  inCompare?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: () => void;
  className?: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const msg = `Check out ${vendorName} on Bhojpatra — a verified caterer in ${vendorCity || "India"}${priceFrom ? ` from ₹${priceFrom.toLocaleString("en-IN")}/plate` : ""}: ${pageUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${vendorName} — Bhojpatra`,
          text: `Check out ${vendorName} on Bhojpatra`,
          url: pageUrl,
        });
      } catch {
        /* User canceled share */
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* Fallback */
      }
    }
  };

  return (
    <div className={`grid grid-cols-4 gap-1.5 sm:gap-2.5 ${className}`}>
      {/* 1. Book Now */}
      <Link
        href={bookHref}
        className="focus-ring flex min-h-[2.75rem] items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-maroon px-1.5 py-2 text-[12px] sm:text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="truncate">{t("Book Now", "अभी बुक करें")}</span>
      </Link>

      {/* 2. WhatsApp */}
      <button
        type="button"
        onClick={handleWhatsApp}
        className="focus-ring flex min-h-[2.75rem] items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-cream-3 bg-white px-1.5 py-2 text-[12px] sm:text-sm font-semibold text-ink shadow-sm transition hover:bg-cream-2 active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-[#25D366]"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.003l-1.416 5.169 5.293-1.387c1.465.799 3.118 1.22 4.779 1.221h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.668-1.038-5.176-2.924-7.062a9.924 9.924 0 0-0-7.067-2.943zm5.836 14.16c-.246.694-1.23 1.272-1.696 1.349-.466.077-1.077.108-1.745-.107-.406-.13-1.071-.345-2.023-.756-2.091-.904-3.443-3.04-3.548-3.18-.105-.141-.849-1.13-.849-2.155 0-1.025.534-1.53.723-1.737.189-.207.412-.259.549-.259.137 0 .275.001.396.007.128.006.3.003.435.328.144.347.494 1.206.538 1.294.043.088.073.19.015.305-.058.115-.088.187-.175.289-.087.102-.184.228-.263.307-.087.087-.178.182-.077.355.101.173.449.742.964 1.201.662.59 1.221.773 1.394.86.173.087.275.073.377-.044.102-.117.435-.506.551-.68.116-.174.232-.145.391-.087.159.058 1.01.476 1.183.563.173.087.289.13.332.203.043.073.043.422-.203 1.116z" />
        </svg>
        <span className="truncate">{t("WhatsApp", "व्हाट्सएप")}</span>
      </button>

      {/* 3. Share */}
      <button
        type="button"
        onClick={handleShare}
        className="focus-ring flex min-h-[2.75rem] items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-cream-3 bg-white px-1.5 py-2 text-[12px] sm:text-sm font-semibold text-ink shadow-sm transition hover:bg-cream-2 active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span className="truncate">
          {copied ? t("Copied!", "कॉपी हो गया!") : t("Share", "शेयर")}
        </span>
      </button>

      {/* 4. Compare */}
      <button
        type="button"
        onClick={onToggleCompare}
        disabled={compareDisabled || !onToggleCompare}
        aria-pressed={inCompare}
        className={
          "focus-ring flex min-h-[2.75rem] items-center justify-center gap-1 sm:gap-1.5 rounded-xl border px-1.5 py-2 text-[12px] sm:text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 " +
          (inCompare
            ? "border-maroon bg-cream-2 text-maroon font-bold"
            : "border-cream-3 bg-white text-ink hover:bg-cream-2")
        }
      >
        <svg
          viewBox="0 0 24 24"
          className={
            "h-4 w-4 shrink-0 " + (inCompare ? "text-maroon" : "text-ink-soft")
          }
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 16l3-8 3 8c-.87.37-1.87.5-3 .5s-2.13-.13-3-.5z" />
          <path d="M2 16l3-8 3 8c-.87.37-1.87.5-3 .5s-2.13-.13-3-.5z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h18" />
        </svg>
        <span className="truncate">
          {inCompare ? t("Added", "जोड़ा गया") : t("Compare", "तुलना")}
        </span>
      </button>
    </div>
  );
}
