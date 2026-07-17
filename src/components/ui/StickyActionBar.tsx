"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import Button from "./Button";

/**
 * Floating bottom CTA dock (above tab bar). Price + primary action, or fully
 * custom children. Glass + soft upward shadow — food-app checkout chrome.
 */
export default function StickyActionBar({
  price,
  priceNote,
  cta,
  href,
  onClick,
  loading,
  disabled,
  children,
  className,
  hidden = false,
}: {
  price?: string;
  priceNote?: string;
  cta?: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <div
      className={cn(
        "app-sticky-cta pointer-events-none",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-sheet border border-maroon/8 bg-white/96 px-3.5 py-2.5 shadow-pop-up backdrop-blur-xl">
        {children ?? (
          <>
            <div className="min-w-0">
              {price && (
                <p className="font-sans text-base font-bold leading-tight text-maroon sm:text-lg">
                  {price}
                </p>
              )}
              {priceNote && (
                <p className="truncate text-[11px] leading-tight text-ink/50">
                  {priceNote}
                </p>
              )}
            </div>
            {cta && (
              <Button
                href={href}
                onClick={onClick}
                loading={loading}
                disabled={disabled}
                size="sm"
                className="min-h-11 shrink-0 px-5"
              >
                {cta}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
