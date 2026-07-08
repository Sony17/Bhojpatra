"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Mobile bottom-sheet / side drawer (Swiggy-style). Slides a panel over a dimmed
 * backdrop; used for filters, menus and detail sheets on small screens. Handles
 * Escape, backdrop click and body-scroll lock.
 *
 * `side`: "bottom" (default, mobile sheet) | "right" (side drawer).
 */
export default function Drawer({
  open,
  onClose,
  title,
  children,
  side = "bottom",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "bottom" | "right";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
      />
      <div
        className={cn(
          "animate-rise relative mt-auto flex max-h-[85vh] w-full flex-col bg-white shadow-modal",
          side === "bottom"
            ? "rounded-t-card"
            : "ml-auto h-full max-h-full w-[min(24rem,90vw)] rounded-l-card",
          className,
        )}
      >
        {side === "bottom" && (
          <span className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-cream-3" />
        )}
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
            <h2 className="text-title text-ink">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="focus-ring rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
